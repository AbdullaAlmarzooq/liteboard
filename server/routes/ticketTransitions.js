// server/routes/ticketTransitions.js
const express = require("express");
const db = require("../db/db");
const router = express.Router();


const isValidTransition = async (workflowId, fromStepCode, toStepCode) => {
  const { rows } = await db.query(
    `
      SELECT id FROM workflow_transitions
      WHERE workflow_id = $1 AND from_step_code = $2 AND to_step_code = $3
    `,
    [workflowId, fromStepCode, toStepCode]
  );
  return !!rows[0];
};

const getAllowedNextSteps = async (ticketId) => {
  const ticketResult = await db.query(
    `SELECT workflow_id, step_code FROM tickets WHERE id::text = $1 OR ticket_code = $1`,
    [ticketId]
  );
  const ticket = ticketResult.rows[0];
  if (!ticket || !ticket.workflow_id) return [];

  const { rows } = await db.query(
    `
      SELECT
        ws.step_code,
        ws.step_name,
        wt.cancel_allowed
      FROM workflow_transitions wt
      JOIN workflow_steps ws
        ON wt.workflow_id = ws.workflow_id AND wt.to_step_code = ws.step_code
      WHERE wt.workflow_id = $1 AND wt.from_step_code = $2
    `,
    [ticket.workflow_id, ticket.step_code]
  );

  return rows;
};

// GET allowed next steps for a ticket
router.get("/:id/allowed-steps", async (req, res) => {
  const { id } = req.params;
  
  try {
    const allowedSteps = await getAllowedNextSteps(id);
    res.json(allowedSteps);
  } catch (err) {
    console.error("Failed to fetch allowed steps:", err);
    res.status(500).json({ error: "Failed to fetch allowed steps" });
  }
});

// POST update ticket status (workflow transition)
router.post("/:id/transition", async (req, res) => {
  const { id } = req.params;
  const { step_code } = req.body;
  
  if (!step_code) {
    return res.status(400).json({ error: "step_code is required" });
  }
  
  try {
    const currentTicketResult = await db.query(
      `SELECT id, workflow_id, step_code, status FROM tickets WHERE id::text = $1 OR ticket_code = $1`,
      [id]
    );
    const currentTicket = currentTicketResult.rows[0];
    
    if (!currentTicket) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    
    if (step_code === currentTicket.step_code) {
      return res.json({ success: true, message: "Already in this step" });
    }
    
    const isValid = await isValidTransition(
      currentTicket.workflow_id,
      currentTicket.step_code,
      step_code
    );
    
    if (!isValid) {
      return res.status(400).json({
        error: "Invalid workflow transition",
        message: `Cannot transition from ${currentTicket.step_code} to ${step_code}`
      });
    }
    
    const newStepResult = await db.query(
      `SELECT step_name FROM workflow_steps WHERE workflow_id = $1 AND step_code = $2`,
      [currentTicket.workflow_id, step_code]
    );
    const newStep = newStepResult.rows[0];
    
    if (!newStep) {
      return res.status(400).json({ error: "Invalid step_code" });
    }
    
    await db.query(
      `
        UPDATE tickets
        SET step_code = $1, status = $2, updated_at = NOW()
        WHERE id = $3
      `,
      [step_code, newStep.step_name, currentTicket.id]
    );
    
    const updatedTicketResult = await db.query(
      `
        SELECT t.*, ws.step_name as current_step_name
        FROM tickets t
        LEFT JOIN workflow_steps ws
          ON t.workflow_id = ws.workflow_id AND t.step_code = ws.step_code
        WHERE t.id = $1
      `,
      [currentTicket.id]
    );
    const updatedTicket = updatedTicketResult.rows[0];
    
    res.json({
      success: true,
      message: `Transitioned to ${newStep.step_name}`,
      ticket: updatedTicket
    });
    
  } catch (err) {
    console.error("Failed to transition ticket:", err);
    res.status(500).json({ error: "Failed to transition ticket" });
  }
});


module.exports = router;
