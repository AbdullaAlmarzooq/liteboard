// server/routes/workflowManagement.js
const express = require("express");
const db = require("../db/db");
const router = express.Router();
const crypto = require("crypto");

// Helper to generate step codes
const generateStepCode = (workflowId) => {
  return `STEP-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
};

// ----------------------------------------------------------------------
// GET all workflows with steps and transitions
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
          SELECT to_step_code FROM workflow_transitions WHERE from_step_code = ?
        `).all(step.step_code).map(r => r.to_step_code);

        const prevSteps = db.prepare(`
          SELECT from_step_code FROM workflow_transitions WHERE to_step_code = ?
        `).all(step.step_code).map(r => r.from_step_code);

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
// POST create or update workflow with steps and transitions
// ----------------------------------------------------------------------
router.post("/", (req, res) => {
  const { id, name, steps } = req.body;

  if (!name || !steps || !Array.isArray(steps)) {
    return res.status(400).json({ error: "Invalid workflow data" });
  }

  try {
    // If new workflow
    let workflowId = id;
    if (!workflowId) {
      workflowId = `WF-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      db.prepare(`INSERT INTO workflows (id, name, active, created_at) VALUES (?, ?, 1, datetime('now'))`).run(workflowId, name);
    } else {
      // Update existing workflow name
      db.prepare(`UPDATE workflows SET name = ?, updated_at = datetime('now') WHERE id = ?`).run(name, workflowId);
    }

    // Save steps
    steps.forEach((step, index) => {
      const stepCode = step.stepCode || generateStepCode(workflowId);

      // Upsert step
      db.prepare(`
        INSERT INTO workflow_steps (workflow_id, step_code, step_name, step_order, category_code, workgroup_code)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(step_code) DO UPDATE SET
          step_name = excluded.step_name,
          step_order = excluded.step_order,
          category_code = excluded.category_code,
          workgroup_code = excluded.workgroup_code
      `).run(workflowId, stepCode, step.stepName, index + 1, step.categoryCode, step.workgroupCode);

      step.stepCode = stepCode; // Ensure stepCode exists for transitions
    });

    // Clear old transitions for this workflow
    db.prepare(`
      DELETE FROM workflow_transitions WHERE from_step_code IN (
        SELECT step_code FROM workflow_steps WHERE workflow_id = ?
      )
    `).run(workflowId);

    // Insert transitions
    steps.forEach(step => {
      // Next steps
      if (step.allowedNextSteps && step.allowedNextSteps.length) {
        step.allowedNextSteps.forEach(nextStepName => {
          const nextStep = steps.find(s => s.stepName === nextStepName);
          if (nextStep) {
            db.prepare(`
              INSERT INTO workflow_transitions (workflow_id, from_step_code, to_step_code)
              VALUES (?, ?, ?)
            `).run(workflowId, step.stepCode, nextStep.stepCode);
          }
        });
      }

      // Previous steps
      if (step.allowedPreviousSteps && step.allowedPreviousSteps.length) {
        step.allowedPreviousSteps.forEach(prevStepName => {
          const prevStep = steps.find(s => s.stepName === prevStepName);
          if (prevStep) {
            db.prepare(`
              INSERT INTO workflow_transitions (workflow_id, from_step_code, to_step_code)
              VALUES (?, ?, ?)
            `).run(workflowId, prevStep.stepCode, step.stepCode);
          }
        });
      }

      // Handle Cancel step if categoryCode indicates Cancel (optional)
      if (step.categoryCode === 90) {
        // Allow transition from any step to this Cancel step
        steps.forEach(otherStep => {
          if (otherStep.stepCode !== step.stepCode) {
            db.prepare(`
              INSERT INTO workflow_transitions (workflow_id, from_step_code, to_step_code)
              VALUES (?, ?, ?)
            `).run(workflowId, otherStep.stepCode, step.stepCode);
          }
        });
      }
    });

    res.json({ success: true, workflowId });
  } catch (err) {
    console.error("Failed to save workflow:", err);
    res.status(500).json({ error: "Failed to save workflow" });
  }
});

// PATCH /workflow_management/:id
router.patch("/:id", (req, res) => {
  const workflowId = req.params.id;
  const { name, steps } = req.body;

  if (!name || !steps || !Array.isArray(steps)) {
    return res.status(400).json({ error: "Invalid workflow data" });
  }

  try {
    // Update workflow name
    db.prepare(`UPDATE workflows SET name = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(name, workflowId);

    // Upsert steps
    steps.forEach((step, index) => {
      const stepCode = step.stepCode || `STEP-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

      db.prepare(`
        INSERT INTO workflow_steps (workflow_id, step_code, step_name, step_order, category_code, workgroup_code)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(step_code) DO UPDATE SET
          step_name = excluded.step_name,
          step_order = excluded.step_order,
          category_code = excluded.category_code,
          workgroup_code = excluded.workgroup_code
      `).run(workflowId, stepCode, step.stepName, index + 1, step.categoryCode, step.workgroupCode);

      step.stepCode = stepCode;
    });

    // Get existing transitions
    const existingTransitions = db.prepare(`
      SELECT from_step_code, to_step_code FROM workflow_transitions
      WHERE workflow_id = ?
    `).all(workflowId);

    // Build new transitions from modal data
    const newTransitions = [];
    steps.forEach(step => {
      if (step.allowedNextSteps?.length) {
        step.allowedNextSteps.forEach(nextStepName => {
          const nextStep = steps.find(s => s.stepName === nextStepName);
          if (nextStep) newTransitions.push({ from: step.stepCode, to: nextStep.stepCode });
        });
      }

      if (step.allowedPreviousSteps?.length) {
        step.allowedPreviousSteps.forEach(prevStepName => {
          const prevStep = steps.find(s => s.stepName === prevStepName);
          if (prevStep) newTransitions.push({ from: prevStep.stepCode, to: step.stepCode });
        });
      }

      // Handle Cancel step (optional)
      if (step.categoryCode === 90) {
        steps.forEach(otherStep => {
          if (otherStep.stepCode !== step.stepCode) {
            newTransitions.push({ from: otherStep.stepCode, to: step.stepCode });
          }
        });
      }
    });

    // Remove transitions that are not in newTransitions
    existingTransitions.forEach(t => {
      const exists = newTransitions.some(nt => nt.from === t.from_step_code && nt.to === t.to_step_code);
      if (!exists) {
        db.prepare(`
          DELETE FROM workflow_transitions
          WHERE workflow_id = ? AND from_step_code = ? AND to_step_code = ?
        `).run(workflowId, t.from_step_code, t.to_step_code);
      }
    });

    // Insert new transitions if they don't exist
    newTransitions.forEach(nt => {
      const exists = existingTransitions.some(t => t.from_step_code === nt.from && t.to_step_code === nt.to);
      if (!exists) {
        db.prepare(`
          INSERT INTO workflow_transitions (workflow_id, from_step_code, to_step_code)
          VALUES (?, ?, ?)
        `).run(workflowId, nt.from, nt.to);
      }
    });

    res.json({ success: true, workflowId });
  } catch (err) {
    console.error("Failed to update workflow:", err);
    res.status(500).json({ error: "Failed to update workflow" });
  }
});

module.exports = router;
