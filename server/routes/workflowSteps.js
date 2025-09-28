const express = require("express");
const db = require("../db/db");
const router = express.Router();

// Get allowed next steps for a ticket
router.get("/allowed/:ticketId", (req, res) => {
  const { ticketId } = req.params;

  const query = `
    SELECT t.workflow_id, t.step_code, ws.step_order
    FROM tickets t
    JOIN workflow_steps ws ON t.step_code = ws.step_code
    WHERE t.id = ?
  `;

  db.get(query, [ticketId], (err, ticketRow) => {
    if (err || !ticketRow) {
      return res.status(500).json({ error: "Ticket not found or query failed" });
    }

    const { workflow_id, step_order } = ticketRow;

    // Find possible steps
    const stepsQuery = `
      SELECT * FROM workflow_steps
      WHERE workflow_id = ?
      AND (step_order = ? - 1 OR step_order = ? + 1)
      ORDER BY step_order
    `;

    db.all(stepsQuery, [workflow_id, step_order, step_order], (err2, rows) => {
      if (err2) {
        return res.status(500).json({ error: "Failed to fetch workflow steps" });
      }

      // Add Cancelled option as global
      rows.push({ id: "cancelled", step_code: "CANCELLED", step_name: "Cancelled" });

      res.json(rows);
    });
  });
});

module.exports = router;
