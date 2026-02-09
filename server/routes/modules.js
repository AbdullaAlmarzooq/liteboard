const express = require("express");
const db = require("../db/db");
const router = express.Router();
const crypto = require("crypto");

// Helper to generate sequential MOD-xxx ID
const generateModuleId = async () => {
  try {
    const { rows } = await db.query(
      `
        SELECT id FROM modules
        WHERE id LIKE 'MOD-%'
        ORDER BY id DESC
        LIMIT 1
      `
    );
    const result = rows[0];

    if (result) {

      const parts = result.id.split('-');
      if (parts.length === 2) {
          const currentNum = parseInt(parts[1]);
          if (!isNaN(currentNum)) {
            const nextNum = currentNum + 1;

            return `MOD-${String(nextNum).padStart(3, '0')}`;
          }
      }
    }

    return 'MOD-001';
  } catch (err) {
    console.error('Error generating sequential Module ID:', err);

    return `MOD-${String(Date.now()).slice(-4)}`; 
  }
};

// ----------------------------------------------------------------------
// GET all active modules (for dropdowns/lists)
// ----------------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const modulesQuery = `
      SELECT 
        id, 
        name, 
        description, 
        active, 
        created_at, 
        updated_at
      FROM modules
      WHERE active = true
      ORDER BY name ASC
    `;
    const { rows } = await db.query(modulesQuery);

    res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error("Error fetching modules:", err);
    res.status(500).json({ error: "Failed to fetch modules" });
  }
});

// ----------------------------------------------------------------------
// GET module by ID (useful for editing)
// ----------------------------------------------------------------------
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const moduleQuery = `
      SELECT 
        id, name, description, active, created_at, updated_at
      FROM modules
      WHERE id = $1
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
router.post("/", async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Module name is required" });
  }

  try {
    const newId = await generateModuleId();
    
    // Optional: Check if module with this name already exists (assuming name should be unique)
    const existingResult = await db.query(
      "SELECT id FROM modules WHERE name ILIKE $1",
      [name]
    );
    const existing = existingResult.rows[0];
    if (existing) {
        return res.status(409).json({ error: "A module with this name already exists" });
    }

    await db.query(
      `
        INSERT INTO modules (id, name, description)
        VALUES ($1, $2, $3)
      `,
      [newId, name, description || null]
    );

    res.status(201).json({ message: "Module created successfully", id: newId });
  } catch (err) {
    console.error("Error creating module:", err);
    res.status(500).json({ error: "Failed to create module" });
  }
});

// ----------------------------------------------------------------------
// PUT update an existing module
// ----------------------------------------------------------------------
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description, active } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Module name is required" });
  }

  try {
    // Check if the new name belongs to another module
    const conflictResult = await db.query(
      "SELECT id FROM modules WHERE name ILIKE $1 AND id != $2",
      [name, id]
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
        SET name = $1, description = $2, active = $3
        WHERE id = $4
      `,
      [name, description || null, activeValue, id]
    );

    if (result.rowCount === 0) {
      const existsResult = await db.query("SELECT id FROM modules WHERE id = $1", [id]);
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

module.exports = router;
