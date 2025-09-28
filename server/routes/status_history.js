// server/routes/status_history.js
const express = require("express");
const db = require("../db/db");
const router = express.Router();

// GET status history for a ticket
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
    
    // Transform the records to match what ViewTicket expects
    const transformedHistory = historyRecords.map(record => ({
      id: record.id,
      ticket_id: record.ticket_id,
      type: record.activity_type, // 'status_change', 'field_change', etc.
      fieldName: record.field_name,
      oldValue: record.old_value,
      newValue: record.new_value,
      timestamp: record.timestamp,
      changedBy: record.changed_by
    }));
    
    res.json(transformedHistory);
  } catch (err) {
    console.error("Error fetching status history:", err);
    res.status(500).json({ error: "Failed to fetch status history" });
  }
});

module.exports = router;