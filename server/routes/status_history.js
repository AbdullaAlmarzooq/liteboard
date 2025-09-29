// server/routes/status_history.js
const express = require("express");
const db = require("../db/db");
const router = express.Router();

// Helper to generate ACT-xxx ID
const generateActivityId = () => {
  try {
    const result = db.prepare(`
      SELECT id FROM status_history 
      WHERE id LIKE 'ACT-%' 
      ORDER BY id DESC 
      LIMIT 1
    `).get();

    if (result) {
      const currentNum = parseInt(result.id.split('-')[1]);
      const nextNum = currentNum + 1;
      return `ACT-${String(nextNum).padStart(3, '0')}`;
    }
    return 'ACT-001';
  } catch (err) {
    console.error('Error generating activity ID:', err);
    return `ACT-${String(Date.now()).slice(-3)}`; // fallback
  }
};

// --- GET history for a ticket ---
router.get("/", (req, res) => {
  const { ticketId } = req.query;
  if (!ticketId) {
    return res.status(400).json({ error: "ticketId query parameter is required" });
  }

  try {
    const historyQuery = `
      SELECT id, ticket_id, activity_type, field_name, old_value, new_value, 
             timestamp, changed_by
      FROM status_history 
      WHERE ticket_id = ?
      ORDER BY timestamp ASC
    `;
    const historyRecords = db.prepare(historyQuery).all(ticketId);

    const transformed = historyRecords.map(r => ({
      id: r.id,
      ticket_id: r.ticket_id,
      type: r.activity_type,
      fieldName: r.field_name,
      oldValue: r.old_value,
      newValue: r.new_value,
      timestamp: r.timestamp,
      changedBy: r.changed_by
    }));

    res.json(transformed);
  } catch (err) {
    console.error("Error fetching status history:", err);
    res.status(500).json({ error: "Failed to fetch status history" });
  }
});

// --- POST new history record ---
router.post("/", (req, res) => {
  const { ticket_id, activity_type, field_name, old_value, new_value, changed_by } = req.body;

  if (!ticket_id || !activity_type || !changed_by) {
    return res.status(400).json({ error: "ticket_id, activity_type, and changed_by are required" });
  }

  try {
    const newId = generateActivityId();

    const insertHistory = db.prepare(`
      INSERT INTO status_history 
      (id, ticket_id, activity_type, field_name, old_value, new_value, timestamp, changed_by)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
    `);

    insertHistory.run(newId, ticket_id, activity_type, field_name, old_value, new_value, changed_by);

    res.status(201).json({
      message: "History record created",
      id: newId
    });
  } catch (err) {
    console.error("Error creating history record:", err);
    res.status(500).json({ error: "Failed to create history record" });
  }
});

module.exports = router;
