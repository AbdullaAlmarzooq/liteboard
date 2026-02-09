const express = require("express");
const db = require("../db/db");
const router = express.Router();

// Helper function to generate sequential tag ID (e.g., TAG-001, TAG-002, ...)
const generateTagId = async () => {
  const { rows } = await db.query(
    `
      SELECT id
      FROM tags
      WHERE id LIKE 'TAG-%'
      ORDER BY CAST(SUBSTRING(id FROM 5) AS INTEGER) DESC
      LIMIT 1
    `
  );
  const row = rows[0];

  let nextNumber = 1;
  if (row && row.id) {
    const lastNumber = parseInt(row.id.replace("TAG-", ""), 10);
    nextNumber = lastNumber + 1;
  }

  return `TAG-${String(nextNumber).padStart(3, "0")}`;
};

// --- GET all tags ---
router.get("/", async (req, res) => {
  try {
    const tagsQuery = `
      SELECT id, label, color, created_at, updated_at
      FROM tags
      ORDER BY label ASC
    `;
    const { rows } = await db.query(tagsQuery);

    res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error("Error fetching tags:", err);
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

// --- POST create new tag ---
router.post("/", async (req, res) => {
  const { label, color } = req.body;

  if (!label) {
    return res.status(400).json({ error: "Tag label is required." });
  }

  try {
    // Check for duplicate tag (case-insensitive)
    const existingResult = await db.query(
      "SELECT id FROM tags WHERE label ILIKE $1",
      [label]
    );
    const existing = existingResult.rows[0];
    if (existing) {
      return res.status(409).json({ error: "Tag with this label already exists." });
    }

    // Always use auto-generated sequential ID
    const id = await generateTagId();

    await db.query(
      `
        INSERT INTO tags (id, label, color, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
      `,
      [id, label, color || "#666666"]
    );

    res.status(201).json({
      message: "Tag created successfully",
      id,
      label,
      color: color || "#666666",
    });
  } catch (err) {
    console.error("Error creating tag:", err);
    res.status(500).json({ error: "Failed to create tag" });
  }
});

// --- PUT update existing tag by ID ---
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { label, color } = req.body;

  if (!label && !color) {
    return res.status(400).json({
      error: "At least one field (label or color) is required for update.",
    });
  }

  try {
    const existingResult = await db.query(
      "SELECT label, color FROM tags WHERE id = $1",
      [id]
    );
    const existingTag = existingResult.rows[0];

    if (!existingTag) {
      return res.status(404).json({ error: "Tag not found" });
    }

    const newLabel = label !== undefined ? label : existingTag.label;
    const newColor = color !== undefined ? color : existingTag.color;

    const result = await db.query(
      `
        UPDATE tags
        SET label = $1, color = $2, updated_at = NOW()
        WHERE id = $3
      `,
      [newLabel, newColor, id]
    );

    if (result.rowCount === 0) {
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
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query("DELETE FROM tags WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Tag not found" });
    }

    res.json({ message: "Tag deleted successfully" });
  } catch (err) {
    console.error("Error deleting tag:", err);
    res.status(500).json({ error: "Failed to delete tag" });
  }
});

module.exports = router;
