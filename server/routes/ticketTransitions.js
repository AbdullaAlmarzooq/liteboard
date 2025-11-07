// server/routes/ticketTransitions.js
const express = require("express");
const db = require("../db/db");
const router = express.Router();


// Helper: Validate workflow transition
const isValidTransition = (workflowId, fromStepCode, toStepCode) => {
  const transition = db.prepare(`
    SELECT id FROM workflow_transitions
    WHERE workflow_id = ? AND from_step_code = ? AND to_step_code = ?
  `).get(workflowId, fromStepCode, toStepCode);
  
  return !!transition;
};

// Helper: Get allowed next steps
const getAllowedNextSteps = (ticketId) => {
  const ticket = db.prepare(`
    SELECT workflow_id, step_code FROM tickets WHERE id = ?
  `).get(ticketId);
  
  if (!ticket || !ticket.workflow_id) return [];
  
  const allowedSteps = db.prepare(`
    SELECT 
      ws.step_code,
      ws.step_name,
      ws.category_code,
      wt.cancel_allowed
    FROM workflow_transitions wt
    JOIN workflow_steps ws ON wt.to_step_code = ws.step_code
    WHERE wt.workflow_id = ? AND wt.from_step_code = ?
  `).all(ticket.workflow_id, ticket.step_code);
  
  return allowedSteps;
};

// GET allowed next steps for a ticket
router.get("/:id/allowed-steps", (req, res) => {
  const { id } = req.params;
  
  try {
    const allowedSteps = getAllowedNextSteps(id);
    res.json(allowedSteps);
  } catch (err) {
    console.error("Failed to fetch allowed steps:", err);
    res.status(500).json({ error: "Failed to fetch allowed steps" });
  }
});

// POST update ticket status (workflow transition)
router.post("/:id/transition", (req, res) => {
  const { id } = req.params;
  const { step_code } = req.body;
  
  if (!step_code) {
    return res.status(400).json({ error: "step_code is required" });
  }
  
  try {
    const currentTicket = db.prepare(`
      SELECT workflow_id, step_code, status FROM tickets WHERE id = ?
    `).get(id);
    
    if (!currentTicket) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    
    if (step_code === currentTicket.step_code) {
      return res.json({ success: true, message: "Already in this step" });
    }
    
    const isValid = isValidTransition(
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
    
    const newStep = db.prepare(`
      SELECT step_name FROM workflow_steps WHERE step_code = ?
    `).get(step_code);
    
    if (!newStep) {
      return res.status(400).json({ error: "Invalid step_code" });
    }
    
    db.prepare(`
      UPDATE tickets
      SET step_code = ?, status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(step_code, newStep.step_name, id);
    
    const updatedTicket = db.prepare(`
      SELECT t.*, ws.step_name as current_step_name
      FROM tickets t
      LEFT JOIN workflow_steps ws ON t.step_code = ws.step_code
      WHERE t.id = ?
    `).get(id);
    
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