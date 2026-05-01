// server/routes/workgroups.js
const express = require("express");
const db = require("../db/db");
const router = express.Router();
const authenticateToken = require("../middleware/authMiddleware");
const { buildAdminChangePayload, createAdminEvent } = require("../utils/events");

const generateWorkgroupCode = async () => {
  const { rows } = await db.query(
    `
      SELECT ticket_code
      FROM workgroups
      WHERE ticket_code ~ '^WG-[0-9]+$'
      ORDER BY CAST(SUBSTRING(ticket_code FROM 4) AS INTEGER) DESC
      LIMIT 1
    `
  );

  const currentCode = rows[0]?.ticket_code;
  if (!currentCode) {
    return "WG-001";
  }

  const currentNumber = Number.parseInt(currentCode.replace("WG-", ""), 10);
  const nextNumber = Number.isNaN(currentNumber) ? 1 : currentNumber + 1;
  return `WG-${String(nextNumber).padStart(3, "0")}`;
};

// GET all workgroups
router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id, ticket_code, name, description, active FROM workgroups WHERE deleted_at IS NULL ORDER BY name ASC"
    );

    // Ensure we always return an array
    res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error("Error fetching workgroups:", err);
    res.status(500).json({ error: "Failed to fetch workgroups" });
  }
});

// POST create workgroup
router.post("/", authenticateToken([1]), async (req, res) => {
  const { name, description, ticket_code, active } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "Workgroup name is required" });
  }

  try {
    const trimmedName = String(name).trim();
    const workgroupCode = ticket_code && String(ticket_code).trim()
      ? String(ticket_code).trim()
      : await generateWorkgroupCode();

    const client = await db.pool.connect();
    let createdWorkgroup = null;
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        `
          INSERT INTO workgroups (ticket_code, name, description, active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          RETURNING id, ticket_code, name, description, active, created_at, updated_at
        `,
        [workgroupCode, trimmedName, description || null, active !== undefined ? !!active : true]
      );
      createdWorkgroup = rows[0];

      await createAdminEvent(client, {
        req,
        entity: "workgroup",
        action: "created",
        entityId: createdWorkgroup.id,
        entityName: createdWorkgroup.name,
        after: createdWorkgroup,
      });

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    res.status(201).json(createdWorkgroup);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "A workgroup with this name or code already exists" });
    }
    console.error("Error creating workgroup:", err);
    res.status(500).json({ error: "Failed to create workgroup" });
  }
});

// PUT update workgroup
router.put("/:id", authenticateToken([1]), async (req, res) => {
  const { id } = req.params;
  const { name, description, active } = req.body;

  try {
    const beforeResult = await db.query(
      `
        SELECT id, ticket_code, name, description, active, created_at, updated_at
        FROM workgroups
        WHERE id = $1 AND deleted_at IS NULL
      `,
      [id]
    );
    const beforeWorkgroup = beforeResult.rows[0];

    if (!beforeWorkgroup) {
      return res.status(404).json({ error: "Workgroup not found" });
    }

    const client = await db.pool.connect();
    let updatedWorkgroup = null;
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        `
          UPDATE workgroups
          SET name = $1,
              description = $2,
              active = $3,
              updated_at = NOW()
          WHERE id = $4 AND deleted_at IS NULL
          RETURNING id, ticket_code, name, description, active, created_at, updated_at
        `,
        [
          name ? String(name).trim() : beforeWorkgroup.name,
          description !== undefined ? description || null : beforeWorkgroup.description,
          active !== undefined ? !!active : beforeWorkgroup.active,
          id,
        ]
      );
      updatedWorkgroup = rows[0];

      const { changes, before, after } = buildAdminChangePayload(beforeWorkgroup, updatedWorkgroup, {
        fields: ["name", "description"],
        fieldLabels: {
          name: "Name",
          description: "Description",
        },
      });

      if (changes.length > 0) {
        await createAdminEvent(client, {
          req,
          entity: "workgroup",
          action: "updated",
          entityId: id,
          entityName: updatedWorkgroup.name,
          changes,
          before,
          after,
        });
      }

      if (beforeWorkgroup.active !== updatedWorkgroup.active) {
        await createAdminEvent(client, {
          req,
          entity: "workgroup",
          action: updatedWorkgroup.active ? "activated" : "deactivated",
          entityId: id,
          entityName: updatedWorkgroup.name,
          changes: [{
            field: "active",
            label: "Active",
            old_value: beforeWorkgroup.active,
            new_value: updatedWorkgroup.active,
          }],
          before: beforeWorkgroup,
          after: updatedWorkgroup,
        });
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    res.json(updatedWorkgroup);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "A workgroup with this name or code already exists" });
    }
    console.error("Error updating workgroup:", err);
    res.status(500).json({ error: "Failed to update workgroup" });
  }
});

// DELETE workgroup (soft delete)
router.delete("/:id", authenticateToken([1]), async (req, res) => {
  const { id } = req.params;

  try {
    const beforeResult = await db.query(
      `
        SELECT id, ticket_code, name, description, active, created_at, updated_at
        FROM workgroups
        WHERE id = $1 AND deleted_at IS NULL
      `,
      [id]
    );
    const beforeWorkgroup = beforeResult.rows[0];

    if (!beforeWorkgroup) {
      return res.status(404).json({ error: "Workgroup not found" });
    }

    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `
          UPDATE workgroups
          SET active = false, deleted_at = NOW(), updated_at = NOW()
          WHERE id = $1 AND deleted_at IS NULL
        `,
        [id]
      );

      await createAdminEvent(client, {
        req,
        entity: "workgroup",
        action: "deleted",
        entityId: beforeWorkgroup.id,
        entityName: beforeWorkgroup.name,
        before: beforeWorkgroup,
      });

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    res.json({ message: "Workgroup deleted successfully" });
  } catch (err) {
    console.error("Error deleting workgroup:", err);
    res.status(500).json({ error: "Failed to delete workgroup" });
  }
});

module.exports = router;
