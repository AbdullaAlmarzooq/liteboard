// server/routes/workflows.js
const express = require("express");
const db = require("../db/db");
const router = express.Router();

// ----------------------------------------------------------------------
// GET all active workflows with their steps
// ----------------------------------------------------------------------
router.get("/", (req, res) => {
  const query = `
    SELECT 
      w.id AS workflow_id,
      w.name,
      w.description,
      w.active,
      w.created_at,
      w.updated_at,
      ws.id AS step_id,
      ws.step_code,
      ws.step_name,
      ws.step_order,
      ws.workgroup_code,
      ws.category_code,
      wg.name AS workgroup_name
    FROM workflows w
    LEFT JOIN workflow_steps ws ON w.id = ws.workflow_id
    LEFT JOIN workgroups wg ON ws.workgroup_code = wg.id
    WHERE w.active = 1
    ORDER BY w.id, ws.step_order
  `;

  try {
    const rows = db.prepare(query).all();

    const workflowsMap = {};
    rows.forEach(row => {
      if (!workflowsMap[row.workflow_id]) {
        workflowsMap[row.workflow_id] = {
          id: row.workflow_id,
          name: row.name,
          description: row.description,
          active: row.active,
          created_at: row.created_at,
          updated_at: row.updated_at,
          steps: []
        };
      }

      if (row.step_id) {
        workflowsMap[row.workflow_id].steps.push({
          id: row.step_id,
          stepCode: row.step_code,
          stepName: row.step_name,
          stepOrder: row.step_order,
          workgroupCode: row.workgroup_code,
          workgroupName: row.workgroup_name,
          categoryCode: row.category_code
        });
      }
    });

    res.json(Object.values(workflowsMap));
  } catch (err) {
    console.error("Failed to fetch workflows:", err);
    res.status(500).json({ error: "Failed to fetch workflows" });
  }
});

// ----------------------------------------------------------------------
// GET single workflow by ID with steps
// ----------------------------------------------------------------------
router.get("/:id", (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT 
      w.id AS workflow_id,
      w.name,
      w.description,
      w.active,
      w.created_at,
      w.updated_at,
      ws.id AS step_id,
      ws.step_code,
      ws.step_name,
      ws.step_order,
      ws.workgroup_code,
      ws.category_code,
      wg.name AS workgroup_name
    FROM workflows w
    LEFT JOIN workflow_steps ws ON w.id = ws.workflow_id
    LEFT JOIN workgroups wg ON ws.workgroup_code = wg.id
    WHERE w.id = ? AND w.active = 1
    ORDER BY ws.step_order
  `;

  try {
    const rows = db.prepare(query).all([id]);

    if (!rows.length) {
      return res.status(404).json({ error: "Workflow not found or inactive" });
    }

    const workflow = {
      id: rows[0].workflow_id,
      name: rows[0].name,
      description: rows[0].description,
      active: rows[0].active,
      created_at: rows[0].created_at,
      updated_at: rows[0].updated_at,
      steps: []
    };

    rows.forEach(row => {
      if (row.step_id) {
        workflow.steps.push({
          id: row.step_id,
          stepCode: row.step_code,
          stepName: row.step_name,
          stepOrder: row.step_order,
          workgroupCode: row.workgroup_code,
          workgroupName: row.workgroup_name,
          categoryCode: row.category_code
        });
      }
    });

    res.json(workflow);
  } catch (err) {
    console.error("Failed to fetch workflow:", err);
    res.status(500).json({ error: "Failed to fetch workflow" });
  }
});

module.exports = router;
