const express = require("express");
const db = require("../db/db");
const router = express.Router();
const authenticateToken = require("../middleware/authMiddleware");
const { buildProjectAccessFilter, getProjectAccess } = require("../utils/projectAccess");

// ----------------------------------------------------------------------
// GET all active modules (for dropdowns/lists)
// ----------------------------------------------------------------------
router.get("/", authenticateToken(), async (req, res) => {
  const { project_id: projectId } = req.query;

  try {
    if (projectId) {
      const projectAccess = await getProjectAccess(req.user, projectId, {
        requireActiveForNonAdmin: true,
      });

      if (projectAccess.status !== 200) {
        return res.status(projectAccess.status).json({ error: projectAccess.message });
      }
    }

    const isAdmin = Number(req.user?.role_id) === 1;
    let selectPrefix = "";
    let joinClause = "";
    let whereClause = "WHERE m.active = true AND m.deleted_at IS NULL";
    let queryParams = [];

    if (projectId) {
      joinClause = `
        JOIN project_modules pm ON pm.module_id = m.id
      `;
      queryParams = [projectId];
      whereClause += "\n      AND pm.project_id = $1";
    } else if (!isAdmin) {
      joinClause = `
        JOIN project_modules pm ON pm.module_id = m.id
      `;
      const accessFilter = await buildProjectAccessFilter(req.user, "pm.project_id");
      whereClause += accessFilter.clause;
      queryParams = accessFilter.params;
      selectPrefix = "DISTINCT ";
    }

    const modulesQuery = `
      SELECT 
        ${selectPrefix}m.id, 
        m.name, 
        m.description, 
        m.active, 
        m.created_at, 
        m.updated_at
      FROM modules m
      ${joinClause}
      ${whereClause}
      ORDER BY m.name ASC
    `;
    const { rows } = await db.query(modulesQuery, queryParams);

    res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error("Error fetching modules:", err);
    res.status(500).json({ error: "Failed to fetch modules" });
  }
});

// ----------------------------------------------------------------------
// GET module by ID (useful for editing)
// ----------------------------------------------------------------------
router.get("/:id", authenticateToken(), async (req, res) => {
  const { id } = req.params;
  try {
    const moduleQuery = `
      SELECT 
        id, name, description, active, created_at, updated_at
      FROM modules
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const { rows } = await db.query(moduleQuery, [id]);
    const module = rows[0];

    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }

    res.json(module);
  } catch (err) {
    console.error("Error fetching module:", err);
    res.status(500).json({ error: "Failed to fetch module" });
  }
});

// ----------------------------------------------------------------------
// POST create a new module
// ----------------------------------------------------------------------
router.post("/", authenticateToken([1]), async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Module name is required" });
  }

  try {
    const trimmedName = String(name).trim();
    const existingResult = await db.query(
      "SELECT id FROM modules WHERE name ILIKE $1 AND deleted_at IS NULL",
      [trimmedName]
    );
    const existing = existingResult.rows[0];
    if (existing) {
        return res.status(409).json({ error: "A module with this name already exists" });
    }

    const { rows } = await db.query(
      `
        INSERT INTO modules (name, description)
        VALUES ($1, $2)
        RETURNING id, name, description, active, created_at, updated_at
      `,
      [trimmedName, description || null]
    );
    const createdModule = rows[0];

    res.status(201).json({
      message: "Module created successfully",
      ...createdModule,
    });
  } catch (err) {
    console.error("Error creating module:", err);
    res.status(500).json({ error: "Failed to create module" });
  }
});

// ----------------------------------------------------------------------
// PUT update an existing module
// ----------------------------------------------------------------------
router.put("/:id", authenticateToken([1]), async (req, res) => {
  const { id } = req.params;
  const { name, description, active } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Module name is required" });
  }

  try {
    const trimmedName = String(name).trim();
    // Check if the new name belongs to another module
    const conflictResult = await db.query(
      "SELECT id FROM modules WHERE name ILIKE $1 AND id != $2 AND deleted_at IS NULL",
      [trimmedName, id]
    );
    const nameConflict = conflictResult.rows[0];
    if (nameConflict) {
        return res.status(409).json({ error: "This module name is already in use by another module" });
    }

    const activeValue =
      typeof active === "boolean" ? active : active === undefined || active === null ? true : active;

    const result = await db.query(
      `
        UPDATE modules
        SET name = $1, description = $2, active = $3, updated_at = NOW()
        WHERE id = $4 AND deleted_at IS NULL
      `,
      [trimmedName, description || null, activeValue, id]
    );

    if (result.rowCount === 0) {
      const existsResult = await db.query(
        "SELECT id FROM modules WHERE id = $1 AND deleted_at IS NULL",
        [id]
      );
      if (!existsResult.rows[0]) {
        return res.status(404).json({ error: "Module not found" });
      }
      return res.status(200).json({ message: "Module updated successfully (or no changes made)" });
    }

    res.json({ message: "Module updated successfully" });
  } catch (err) {
    console.error("Error updating module:", err);
    res.status(500).json({ error: "Failed to update module" });
  }
});

// ----------------------------------------------------------------------
// DELETE module (soft delete)
// ----------------------------------------------------------------------
router.delete("/:id", authenticateToken([1]), async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      `
        UPDATE modules
        SET active = false, deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
      `,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Module not found" });
    }

    res.json({ message: "Module deleted successfully" });
  } catch (err) {
    console.error("Error deleting module:", err);
    res.status(500).json({ error: "Failed to delete module" });
  }
});

module.exports = router;
