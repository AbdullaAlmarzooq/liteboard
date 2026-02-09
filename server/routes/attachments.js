// server/routes/attachments.js
const express = require("express");
const db = require("../db/db");
const router = express.Router();
const crypto = require("crypto");

const resolveTicketId = async (ticketId) => {
  const { rows } = await db.query(
    "SELECT id FROM tickets WHERE (id::text = $1 OR ticket_code = $1) AND deleted_at IS NULL",
    [ticketId]
  );
  return rows[0]?.id || null;
};

// ----------------------------------------------------------------------
// GET all attachments for a ticket
// ----------------------------------------------------------------------
router.get("/:id/blob", async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query(
      `
        SELECT attachment_id, base64_data
        FROM attachment_blobs
        WHERE attachment_id = $1
      `,
      [id]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: "Attachment blob not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching attachment blob:", err);
    res.status(500).json({ error: "Failed to fetch attachment blob" });
  }
});

// ----------------------------------------------------------------------
// GET all attachments metadata for a ticket
// ----------------------------------------------------------------------
router.get("/:ticketId", async (req, res) => {
  const { ticketId } = req.params;
  try {
    const resolvedTicketId = await resolveTicketId(ticketId);
    if (!resolvedTicketId) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    const { rows } = await db.query(`
      SELECT 
        id, ticket_id, 
        filename AS name,
        file_type AS type,
        file_size AS size,
        uploaded_at AS created_at,
        uploaded_by AS created_by,
        (ab.attachment_id IS NOT NULL) AS has_blob
      FROM attachments 
      LEFT JOIN attachment_blobs ab ON ab.attachment_id = attachments.id
      WHERE ticket_id = $1
      ORDER BY uploaded_at ASC
    `, [resolvedTicketId]);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching attachments:", err);
    res.status(500).json({ error: "Failed to fetch attachments" });
  }
});

// ----------------------------------------------------------------------
// POST a new attachment
// ----------------------------------------------------------------------
router.post("/", async (req, res) => {
  const { ticket_id, name, type, size, data, created_by } = req.body;

  if (!ticket_id || !name || !type || !size || !data) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (size > 1024 * 1024) { // 1 MB max
    return res.status(400).json({ error: "Attachment exceeds 1 MB limit" });
  }

  try {
    const resolvedTicketId = await resolveTicketId(ticket_id);
    if (!resolvedTicketId) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    const newId = crypto.randomUUID();
    const storageKey = `inline://${newId}`;

    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `
          INSERT INTO attachments
            (id, ticket_id, filename, file_type, file_size, storage_key, uploaded_at, uploaded_by)
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
        `,
        [newId, resolvedTicketId, name, type, size, storageKey, created_by]
      );

      await client.query(
        `
          INSERT INTO attachment_blobs (attachment_id, base64_data)
          VALUES ($1, $2)
        `,
        [newId, data]
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    res.status(201).json({ message: "Attachment added", id: newId });
  } catch (err) {
    console.error("Error adding attachment:", err);
    res.status(500).json({ error: "Failed to add attachment" });
  }
});

// ----------------------------------------------------------------------
// DELETE an attachment
// ----------------------------------------------------------------------
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query("DELETE FROM attachments WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Attachment not found" });
    }
    res.json({ message: "Attachment deleted" });
  } catch (err) {
    console.error("Error deleting attachment:", err);
    res.status(500).json({ error: "Failed to delete attachment" });
  }
});

module.exports = router;
