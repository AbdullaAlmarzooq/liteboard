// server/routes/attachments.js
const express = require("express");
const db = require("../db/db");
const router = express.Router();
const crypto = require("crypto");

// ----------------------------------------------------------------------
// GET all attachments for a ticket
// ----------------------------------------------------------------------
router.get("/:ticketId", (req, res) => {
  const { ticketId } = req.params;
  try {
    const rows = db.prepare(`
      SELECT 
        id, ticket_id, 
        filename AS name,
        file_type AS type,
        file_size AS size,
        file_data AS data,
        uploaded_at AS created_at,
        uploaded_by AS created_by
      FROM attachments 
      WHERE ticket_id = ?
      ORDER BY uploaded_at ASC
    `).all(ticketId);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching attachments:", err);
    res.status(500).json({ error: "Failed to fetch attachments" });
  }
});

// ----------------------------------------------------------------------
// POST a new attachment
// ----------------------------------------------------------------------
router.post("/", (req, res) => {
  const { ticket_id, name, type, size, data, created_by } = req.body;

  if (!ticket_id || !name || !type || !size || !data || !created_by) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (size > 1024 * 1024) { // 1 MB max
    return res.status(400).json({ error: "Attachment exceeds 1 MB limit" });
  }

  try {
    const newId = `ATT-${crypto.randomBytes(4).toString("hex")}`;

    db.prepare(`
      INSERT INTO attachments 
        (id, ticket_id, filename, file_type, file_size, file_data, uploaded_at, uploaded_by) 
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
    `).run(newId, ticket_id, name, type, size, data, created_by);

    res.status(201).json({ message: "Attachment added", id: newId });
  } catch (err) {
    console.error("Error adding attachment:", err);
    res.status(500).json({ error: "Failed to add attachment" });
  }
});

// ----------------------------------------------------------------------
// DELETE an attachment
// ----------------------------------------------------------------------
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  try {
    const result = db.prepare("DELETE FROM attachments WHERE id = ?").run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Attachment not found" });
    }
    res.json({ message: "Attachment deleted" });
  } catch (err) {
    console.error("Error deleting attachment:", err);
    res.status(500).json({ error: "Failed to delete attachment" });
  }
});

module.exports = router;
