//server/routes/workflowSteps.js

const express = require("express");
const db = require("../db/db");
const router = express.Router();

// Get allowed next steps for a ticket
router.get("/allowed/:ticketId", async (req, res) => {
  const { ticketId } = req.params;

  try {
    const ticketQuery = `
      SELECT t.workflow_id, t.step_code, ws.step_order
      FROM tickets t
      JOIN workflow_steps ws 
        ON t.workflow_id = ws.workflow_id AND t.step_code = ws.step_code
      WHERE t.id::text = $1 OR t.ticket_code = $1
    `;
    const ticketResult = await db.query(ticketQuery, [ticketId]);
    const ticketRow = ticketResult.rows[0];

    if (!ticketRow) {
      return res.status(404).json({ error: "Ticket not found or query failed" });
    }

    const { workflow_id, step_order } = ticketRow;

    const stepsQuery = `
      SELECT * FROM workflow_steps
      WHERE workflow_id = $1
      AND (step_order = $2 - 1 OR step_order = $2 + 1)
      ORDER BY step_order
    `;
    const { rows } = await db.query(stepsQuery, [workflow_id, step_order]);

    rows.push({ id: "cancelled", step_code: "CANCELLED", step_name: "Cancelled" });

    res.json(rows);
  } catch (err) {
    console.error("Failed to fetch workflow steps:", err);
    res.status(500).json({ error: "Failed to fetch workflow steps" });
  }
});

module.exports = router;
