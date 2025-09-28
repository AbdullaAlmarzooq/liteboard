// server/routes/tags.js
const express = require("express");
const db = require("../db/db"); 
const router = express.Router();

// Helper function to generate a simple ID (e.g., TAG-001) - NOTE: This is simplistic client-side ID generation
// In a production environment, use UUIDs or rely on the DB to generate IDs.
const generateTagId = (label) => {
    // Simple logic: TAG- first 3 letters of label (uppercase) - random number
    const prefix = label.substring(0, 3).toUpperCase();
    const uniquePart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TAG-${prefix}-${uniquePart}`;
}

// --- GET all tags ---
router.get("/", (req, res) => {
  try {
    const tagsQuery = `
      SELECT id, label, color, created_at, updated_at
      FROM tags
      ORDER BY label ASC
    `;
    const rows = db.prepare(tagsQuery).all();

    res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error("Error fetching tags:", err);
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

// --- POST create new tag ---
router.post("/", (req, res) => {
  const { label, color } = req.body;
  
  if (!label) {
    return res.status(400).json({ error: "Tag label is required." });
  }
  
  // Use user-provided ID or generate a simple one
  const id = req.body.id || generateTagId(label);

  try {
    const insertTag = db.prepare(`
      INSERT INTO tags (id, label, color, created_at, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    
    // Attempt to insert
    insertTag.run(id, label, color || '#666666'); // Provide a default color if missing

    res.status(201).json({ 
        message: "Tag created successfully",
        id: id,
        label: label,
        color: color || '#666666'
    });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed: tags.label')) {
         return res.status(409).json({ error: "Tag with this label already exists." });
    }
    console.error("Error creating tag:", err);
    res.status(500).json({ error: "Failed to create tag" });
  }
});

// --- PUT update existing tag by ID ---
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { label, color } = req.body;

  if (!label && !color) {
    return res.status(400).json({ error: "At least one field (label or color) is required for update." });
  }
  
  try {
    // 1. Fetch current tag data to avoid setting null/undefined if a field is missing in the body
    const existingTag = db.prepare("SELECT label, color FROM tags WHERE id = ?").get(id);
    
    if (!existingTag) {
      return res.status(404).json({ error: "Tag not found" });
    }
    
    // Use the values from the request body, falling back to existing values
    const newLabel = label !== undefined ? label : existingTag.label;
    const newColor = color !== undefined ? color : existingTag.color;

    const updateTag = db.prepare(`
      UPDATE tags
      SET label = ?, color = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const result = updateTag.run(newLabel, newColor, id);

    if (result.changes === 0) {
      // Could mean tag was not found or no change was made
      return res.status(200).json({ message: "Tag updated successfully (or no changes made)." });
    }

    res.json({ message: "Tag updated successfully" });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed: tags.label')) {
         return res.status(409).json({ error: "Tag with this label already exists." });
    }
    console.error("Error updating tag:", err);
    res.status(500).json({ error: "Failed to update tag" });
  }
});

// --- DELETE tag by ID ---
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  try {
    // SQLite foreign keys are set to ON DELETE CASCADE on ticket_tags, 
    // so deleting the tag will automatically remove all associated ticket_tags entries.
    const deleteTag = db.prepare("DELETE FROM tags WHERE id = ?");
    const result = deleteTag.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Tag not found" });
    }

    res.json({ message: "Tag deleted successfully" });
  } catch (err) {
    console.error("Error deleting tag:", err);
    res.status(500).json({ error: "Failed to delete tag" });
  }
});


module.exports = router;