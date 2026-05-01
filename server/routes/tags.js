const express = require("express");
const db = require("../db/db");
const router = express.Router();
const authenticateToken = require("../middleware/authMiddleware");
const { buildProjectAccessFilter, getProjectAccess } = require("../utils/projectAccess");
const { buildAdminChangePayload, createAdminEvent } = require("../utils/events");

// --- GET all tags ---
router.get("/", authenticateToken(), async (req, res) => {
  try {
    const { project_id: projectId } = req.query;

    if (projectId) {
      const projectAccess = await getProjectAccess(req.user, projectId, {
        requireActiveForNonAdmin: true,
      });

      if (projectAccess.status !== 200) {
        return res.status(projectAccess.status).json({ error: projectAccess.message });
      }
    }

    let projectAccessClause = "";
    let projectAccessParams = [];

    if (projectId) {
      projectAccessClause = "\n      AND t.project_id = $1";
      projectAccessParams = [projectId];
    } else {
      const accessFilter = await buildProjectAccessFilter(req.user, "t.project_id");
      projectAccessClause = accessFilter.clause;
      projectAccessParams = accessFilter.params;
    }

    const tagsQuery = `
      SELECT
        t.id,
        t.label,
        t.color,
        t.project_id,
        p.name AS project_name,
        t.created_at,
        t.updated_at
      FROM tags t
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.deleted_at IS NULL${projectAccessClause}
      ORDER BY COALESCE(p.name, 'Unassigned Project') ASC, t.label ASC
    `;
    const { rows } = await db.query(tagsQuery, projectAccessParams);

    res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error("Error fetching tags:", err);
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

// --- POST create new tag ---
router.post("/", authenticateToken([1]), async (req, res) => {
  const { label, color, project_id } = req.body;

  if (!label) {
    return res.status(400).json({ error: "Tag label is required." });
  }

  if (!project_id) {
    return res.status(400).json({ error: "project_id is required." });
  }

  try {
    const projectResult = await db.query(
      `
        SELECT id, name
        FROM projects
        WHERE id = $1
        LIMIT 1
      `,
      [project_id]
    );
    const project = projectResult.rows[0];

    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    // Check for duplicate tag (case-insensitive)
    const existingResult = await db.query(
      "SELECT id FROM tags WHERE label ILIKE $1 AND deleted_at IS NULL",
      [label]
    );
    const existing = existingResult.rows[0];
    if (existing) {
      return res.status(409).json({ error: "Tag with this label already exists." });
    }

    const client = await db.pool.connect();
    let createdTag = null;
    try {
      await client.query("BEGIN");

      const insertResult = await client.query(
        `
          INSERT INTO tags (label, color, project_id, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
          RETURNING id, label, color, project_id
        `,
        [label, color || "#666666", project_id]
      );
      createdTag = insertResult.rows[0];

      await createAdminEvent(client, {
        req,
        entity: "tag",
        action: "created",
        entityId: createdTag.id,
        entityName: createdTag.label,
        after: {
          ...createdTag,
          project_name: project.name,
        },
      });

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    res.status(201).json({
      message: "Tag created successfully",
      id: createdTag.id,
      label: createdTag.label,
      color: createdTag.color,
      project_id: createdTag.project_id,
      project_name: project.name,
    });
  } catch (err) {
    console.error("Error creating tag:", err);
    res.status(500).json({ error: "Failed to create tag" });
  }
});

// --- PUT update existing tag by ID ---
router.put("/:id", authenticateToken([1]), async (req, res) => {
  const { id } = req.params;
  const { label, color } = req.body;

  if (!label && !color) {
    return res.status(400).json({
      error: "At least one field (label or color) is required for update.",
    });
  }

  try {
    const existingResult = await db.query(
      `
        SELECT t.id, t.label, t.color, t.project_id, p.name AS project_name
        FROM tags t
        LEFT JOIN projects p ON p.id = t.project_id
        WHERE t.id = $1 AND t.deleted_at IS NULL
      `,
      [id]
    );
    const existingTag = existingResult.rows[0];

    if (!existingTag) {
      return res.status(404).json({ error: "Tag not found" });
    }

    const newLabel = label !== undefined ? label : existingTag.label;
    const newColor = color !== undefined ? color : existingTag.color;

    const client = await db.pool.connect();
    let rowCount = 0;
    try {
      await client.query("BEGIN");

      const result = await client.query(
        `
          UPDATE tags
          SET label = $1, color = $2, updated_at = NOW()
          WHERE id = $3 AND deleted_at IS NULL
          RETURNING id, label, color, project_id
        `,
        [newLabel, newColor, id]
      );
      rowCount = result.rowCount;

      if (rowCount > 0) {
        const updatedTag = {
          ...result.rows[0],
          project_name: existingTag.project_name,
        };
        const { changes, before, after } = buildAdminChangePayload(existingTag, updatedTag, {
          fields: ["label", "color"],
          fieldLabels: {
            label: "Label",
            color: "Color",
          },
        });

        if (changes.length > 0) {
          await createAdminEvent(client, {
            req,
            entity: "tag",
            action: "updated",
            entityId: id,
            entityName: updatedTag.label,
            changes,
            before,
            after,
          });
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    if (rowCount === 0) {
      return res.status(200).json({
        message: "Tag updated successfully (or no changes made).",
      });
    }

    res.json({ message: "Tag updated successfully" });
  } catch (err) {
    if (err.code === "23505" || err.message.includes("duplicate key")) {
      return res.status(409).json({ error: "Tag with this label already exists." });
    }
    console.error("Error updating tag:", err);
    res.status(500).json({ error: "Failed to update tag" });
  }
});

// --- DELETE tag by ID ---
router.delete("/:id", authenticateToken([1]), async (req, res) => {
  const { id } = req.params;

  try {
    const existingResult = await db.query(
      `
        SELECT t.id, t.label, t.color, t.project_id, p.name AS project_name
        FROM tags t
        LEFT JOIN projects p ON p.id = t.project_id
        WHERE t.id = $1 AND t.deleted_at IS NULL
      `,
      [id]
    );
    const existingTag = existingResult.rows[0];

    if (!existingTag) {
      return res.status(404).json({ error: "Tag not found" });
    }

    const client = await db.pool.connect();
    let rowCount = 0;
    try {
      await client.query("BEGIN");

      const result = await client.query("DELETE FROM tags WHERE id = $1", [id]);
      rowCount = result.rowCount;

      if (rowCount > 0) {
        await createAdminEvent(client, {
          req,
          entity: "tag",
          action: "deleted",
          entityId: existingTag.id,
          entityName: existingTag.label,
          before: existingTag,
        });
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    if (rowCount === 0) {
      return res.status(404).json({ error: "Tag not found" });
    }

    res.json({ message: "Tag deleted successfully" });
  } catch (err) {
    console.error("Error deleting tag:", err);
    res.status(500).json({ error: "Failed to delete tag" });
  }
});

module.exports = router;
