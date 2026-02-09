//server/routes/status_history.js

const express = require("express");
const db = require("../db/db");
const router = express.Router();

// --- GET history for a ticket (Previously fixed) ---
router.get("/", async (req, res) => {
  const { ticketId } = req.query;
  if (!ticketId) {
    return res.status(400).json({ error: "ticketId query parameter is required" });
  }

  try {
    const ticketResult = await db.query(
      "SELECT id FROM tickets WHERE (id::text = $1 OR ticket_code = $1) AND deleted_at IS NULL",
      [ticketId]
    );
    const resolvedTicketId = ticketResult.rows[0]?.id;
    if (!resolvedTicketId) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const historyQuery = `
      SELECT
        sh.id,
        sh.ticket_id,
        sh.activity_type,
        sh.field_name,
        sh.old_value,
        sh.new_value,
        sh.created_at,
        COALESCE(e.name, sh.changed_by::TEXT) AS changed_by_name
      FROM status_history sh
      LEFT JOIN employees e ON sh.changed_by = e.id
      WHERE sh.ticket_id = $1
      ORDER BY sh.created_at ASC
    `;

    const { rows } = await db.query(historyQuery, [resolvedTicketId]);

    const transformed = rows.map(r => ({
      id: r.id,
      ticket_id: r.ticket_id,
      type: r.activity_type,
      fieldName: r.field_name,
      oldValue: r.old_value,
      newValue: r.new_value,
      timestamp: r.created_at,
      changedBy: r.changed_by_name,
    }));

    res.json(transformed);
  } catch (err) {
    console.error("Error fetching status history:", err);
    res.status(500).json({ error: "Failed to fetch status history" });
  }
});

// --- POST new history record (FIXED WHITESPACE) ---
router.post("/", async (req, res) => {
  const { ticket_id, activity_type, field_name, old_value, new_value, changed_by } = req.body;

  if (!ticket_id || !activity_type || !changed_by) {
    return res.status(400).json({ error: "ticket_id, activity_type, and changed_by are required" });
  }

  try {
    const ticketResult = await db.query(
      "SELECT id FROM tickets WHERE (id::text = $1 OR ticket_code = $1) AND deleted_at IS NULL",
      [ticket_id]
    );
    const resolvedTicketId = ticketResult.rows[0]?.id;
    if (!resolvedTicketId) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const result = await db.query(
      `
        INSERT INTO status_history
          (ticket_id, activity_type, field_name, old_value, new_value, changed_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id
      `,
      [resolvedTicketId, activity_type, field_name || null, old_value, new_value, changed_by]
    );

    res.status(201).json({
      message: "History record created",
      id: result.rows[0].id,
    });
  } catch (err) {
    console.error("Error creating history record:", err);
    res.status(500).json({ error: "Failed to create history record" });
  }
});

module.exports = router;
