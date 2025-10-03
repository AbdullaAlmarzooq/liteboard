// server/routes/workflowManagement.js
const express = require("express");
const db = require("../db/db");
const router = express.Router();
const crypto = require("crypto");

// Helper to generate unique codes
const generateStepCode = () => {
  return `STEP-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
};

const generateWorkflowId = () => {
  const last = db.prepare(`
    SELECT id FROM workflows 
    WHERE id LIKE 'WF-%' 
    ORDER BY CAST(SUBSTR(id, 4) AS INTEGER) DESC 
    LIMIT 1
  `).get();

  let nextNumber = 1;
  if (last) {
    nextNumber = parseInt(last.id.replace("WF-", ""), 10) + 1;
  }

  return `WF-${String(nextNumber).padStart(3, "0")}`;
};


// ----------------------------------------------------------------------
// GET all workflows with steps and transitions for Admin Panel
// ----------------------------------------------------------------------
router.get("/", (req, res) => {
  try {
    const workflowsRows = db.prepare(`
      SELECT * FROM workflows WHERE active = 1
    `).all();

    const workflows = workflowsRows.map(wf => {
      const steps = db.prepare(`
        SELECT * FROM workflow_steps WHERE workflow_id = ? ORDER BY step_order
      `).all(wf.id);

      // Get transitions for each step
      steps.forEach(step => {
        const nextSteps = db.prepare(`
          SELECT ws.step_name 
          FROM workflow_transitions wt
          JOIN workflow_steps ws ON wt.to_step_code = ws.step_code
          WHERE wt.from_step_code = ?
        `).all(step.step_code).map(r => r.step_name);

        const prevSteps = db.prepare(`
          SELECT ws.step_name 
          FROM workflow_transitions wt
          JOIN workflow_steps ws ON wt.from_step_code = ws.step_code
          WHERE wt.to_step_code = ?
        `).all(step.step_code).map(r => r.step_name);

        step.allowedNextSteps = nextSteps;
        step.allowedPreviousSteps = prevSteps;
      });

      return { ...wf, steps };
    });

    res.json(workflows);
  } catch (err) {
    console.error("Failed to fetch workflows:", err);
    res.status(500).json({ error: "Failed to fetch workflows" });
  }
});

// ----------------------------------------------------------------------
// POST create new workflow with steps and transitions
// ----------------------------------------------------------------------
router.post("/", (req, res) => {
  const { name, steps } = req.body;

  if (!name || !steps || !Array.isArray(steps) || steps.length === 0) {
    return res.status(400).json({ error: "Invalid workflow data. Name and steps are required." });
  }

  try {
    const workflowId = generateWorkflowId();
    
    // Create workflow
    db.prepare(`
      INSERT INTO workflows (id, name, active, created_at, updated_at) 
      VALUES (?, ?, 1, datetime('now'), datetime('now'))
    `).run(workflowId, name);

    // Create steps with generated step codes
    steps.forEach((step, index) => {
      const stepCode = generateStepCode();
      
      db.prepare(`
        INSERT INTO workflow_steps (
          workflow_id, step_code, step_name, step_order, 
          category_code, workgroup_code
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        workflowId,
        stepCode,
        step.stepName,
        index + 1,
        step.categoryCode || 10,
        step.workgroupCode || null
      );

      step.stepCode = stepCode; // Store for transition creation
    });

    // Create transitions based on allowed next/previous steps
    steps.forEach((step, index) => {
      // Handle next steps
      if (step.allowedNextSteps && step.allowedNextSteps.length > 0) {
        step.allowedNextSteps.forEach(nextStepName => {
          const nextStep = steps.find(s => s.stepName === nextStepName);
          if (nextStep && nextStep.stepCode) {
            db.prepare(`
              INSERT INTO workflow_transitions (
                workflow_id, from_step_code, to_step_code
              ) VALUES (?, ?, ?)
            `).run(workflowId, step.stepCode, nextStep.stepCode);
          }
        });
      }

      // Handle previous steps
      if (step.allowedPreviousSteps && step.allowedPreviousSteps.length > 0) {
        step.allowedPreviousSteps.forEach(prevStepName => {
          const prevStep = steps.find(s => s.stepName === prevStepName);
          if (prevStep && prevStep.stepCode) {
            // Check if transition already exists
            const exists = db.prepare(`
              SELECT id FROM workflow_transitions
              WHERE workflow_id = ? AND from_step_code = ? AND to_step_code = ?
            `).get(workflowId, prevStep.stepCode, step.stepCode);
            
            if (!exists) {
              db.prepare(`
                INSERT INTO workflow_transitions (
                  workflow_id, from_step_code, to_step_code
                ) VALUES (?, ?, ?)
              `).run(workflowId, prevStep.stepCode, step.stepCode);
            }
          }
        });
      }

      // Handle Cancel step (category_code 90)
      if (step.categoryCode === 90) {
        steps.forEach(otherStep => {
          if (otherStep.stepCode && otherStep.stepCode !== step.stepCode) {
            db.prepare(`
              INSERT INTO workflow_transitions (
                workflow_id, from_step_code, to_step_code, cancel_allowed
              ) VALUES (?, ?, ?, 1)
            `).run(workflowId, otherStep.stepCode, step.stepCode);
          }
        });
      }
    });

    res.json({ success: true, workflowId });
  } catch (err) {
    console.error("Failed to create workflow:", err);
    res.status(500).json({ error: "Failed to create workflow" });
  }
});

// ----------------------------------------------------------------------
// PATCH update existing workflow
// ----------------------------------------------------------------------
router.patch("/:id", (req, res) => {
  const workflowId = req.params.id;
  const { name, steps } = req.body;

  if (!name || !steps || !Array.isArray(steps) || steps.length === 0) {
    return res.status(400).json({ error: "Invalid workflow data" });
  }

  try {
    // Update workflow name
    db.prepare(`
      UPDATE workflows 
      SET name = ?, updated_at = datetime('now') 
      WHERE id = ?
    `).run(name, workflowId);

    // Get existing steps to preserve step_codes
    const existingSteps = db.prepare(`
      SELECT step_code, step_name FROM workflow_steps 
      WHERE workflow_id = ?
    `).all(workflowId);

    // Upsert steps
    steps.forEach((step, index) => {
      // Try to match by name to preserve step_code
      const existingStep = existingSteps.find(es => es.step_name === step.stepName);
      const stepCode = step.stepCode || existingStep?.step_code || generateStepCode();

      db.prepare(`
        INSERT INTO workflow_steps (
          workflow_id, step_code, step_name, step_order, 
          category_code, workgroup_code
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(step_code) DO UPDATE SET
          step_name = excluded.step_name,
          step_order = excluded.step_order,
          category_code = excluded.category_code,
          workgroup_code = excluded.workgroup_code
      `).run(
        workflowId,
        stepCode,
        step.stepName,
        index + 1,
        step.categoryCode || 10,
        step.workgroupCode || null
      );

      step.stepCode = stepCode;
    });

    // Remove steps that are no longer in the workflow
    const currentStepCodes = steps.map(s => s.stepCode);
    db.prepare(`
      DELETE FROM workflow_steps 
      WHERE workflow_id = ? AND step_code NOT IN (${currentStepCodes.map(() => '?').join(',')})
    `).run(workflowId, ...currentStepCodes);

    // Clear all transitions for this workflow
    db.prepare(`
      DELETE FROM workflow_transitions 
      WHERE workflow_id = ?
    `).run(workflowId);

    // Recreate transitions
    steps.forEach(step => {
      // Next steps
      if (step.allowedNextSteps && step.allowedNextSteps.length > 0) {
        step.allowedNextSteps.forEach(nextStepName => {
          const nextStep = steps.find(s => s.stepName === nextStepName);
          if (nextStep && nextStep.stepCode) {
            db.prepare(`
              INSERT INTO workflow_transitions (
                workflow_id, from_step_code, to_step_code
              ) VALUES (?, ?, ?)
            `).run(workflowId, step.stepCode, nextStep.stepCode);
          }
        });
      }

      // Previous steps
      if (step.allowedPreviousSteps && step.allowedPreviousSteps.length > 0) {
        step.allowedPreviousSteps.forEach(prevStepName => {
          const prevStep = steps.find(s => s.stepName === prevStepName);
          if (prevStep && prevStep.stepCode) {
            const exists = db.prepare(`
              SELECT id FROM workflow_transitions
              WHERE workflow_id = ? AND from_step_code = ? AND to_step_code = ?
            `).get(workflowId, prevStep.stepCode, step.stepCode);
            
            if (!exists) {
              db.prepare(`
                INSERT INTO workflow_transitions (
                  workflow_id, from_step_code, to_step_code
                ) VALUES (?, ?, ?)
              `).run(workflowId, prevStep.stepCode, step.stepCode);
            }
          }
        });
      }

      // Cancel step
      if (step.categoryCode === 90) {
        steps.forEach(otherStep => {
          if (otherStep.stepCode && otherStep.stepCode !== step.stepCode) {
            db.prepare(`
              INSERT INTO workflow_transitions (
                workflow_id, from_step_code, to_step_code, cancel_allowed
              ) VALUES (?, ?, ?, 1)
            `).run(workflowId, otherStep.stepCode, step.stepCode);
          }
        });
      }
    });

    res.json({ success: true, workflowId });
  } catch (err) {
    console.error("Failed to update workflow:", err);
    res.status(500).json({ error: "Failed to update workflow" });
  }
});

// ----------------------------------------------------------------------
// DELETE workflow
// ----------------------------------------------------------------------
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  try {
    // Soft delete by setting active = 0
    db.prepare(`
      UPDATE workflows 
      SET active = 0, updated_at = datetime('now') 
      WHERE id = ?
    `).run(id);

    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete workflow:", err);
    res.status(500).json({ error: "Failed to delete workflow" });
  }
});

module.exports = router;