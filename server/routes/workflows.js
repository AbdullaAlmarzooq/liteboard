// server/routes/workflows.js
const express = require("express");
const db = require("../db/db");
const router = express.Router();

// GET workflow by ID with steps
router.get("/:id", (req, res) => {
  const { id } = req.params;
  
  try {
    // Get the workflow
    const workflowQuery = `
      SELECT id, name, description, active, created_at, updated_at
      FROM workflows 
      WHERE id = ? AND active = 1
    `;
    
    const workflow = db.prepare(workflowQuery).get(id);
    
    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found or inactive" });
    }
    
    // Get the workflow steps with workgroup names
    const stepsQuery = `
      SELECT ws.id, ws.step_code, ws.step_name, ws.step_order, 
             ws.category_code, ws.created_at,
             w.name AS workgroup_name
      FROM workflow_steps ws
      LEFT JOIN workgroups w ON ws.workgroup_code = w.id
      WHERE ws.workflow_id = ?
      ORDER BY ws.step_order ASC
    `;
    
    const steps = db.prepare(stepsQuery).all(id);
    
    // Transform steps to match what ViewTicket expects
    const transformedSteps = steps.map(step => ({
      id: step.id,
      stepCode: step.step_code,
      stepName: step.step_name,
      stepOrder: step.step_order,
      workgroupName: step.workgroup_name,
      categoryCode: step.category_code,
      createdAt: step.created_at
    }));
    
    const workflowResponse = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      active: workflow.active,
      created_at: workflow.created_at,
      updated_at: workflow.updated_at,
      steps: transformedSteps
    };
    
    res.json(workflowResponse);
  } catch (err) {
    console.error("Error fetching workflow:", err);
    res.status(500).json({ error: "Failed to fetch workflow" });
  }
});

// GET all active workflows
router.get("/", (req, res) => {
  try {
    const workflowsQuery = `
      SELECT id, name, description, active, created_at, updated_at
      FROM workflows 
      WHERE active = 1
      ORDER BY name ASC
    `;
    
    const workflows = db.prepare(workflowsQuery).all();
    res.json(workflows);
  } catch (err) {
    console.error("Error fetching workflows:", err);
    res.status(500).json({ error: "Failed to fetch workflows" });
  }
});

module.exports = router;