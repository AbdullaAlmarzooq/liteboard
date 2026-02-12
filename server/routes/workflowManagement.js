// server/routes/workflowManagement.js
const express = require("express");
const db = require("../db/db");
const router = express.Router();

const normalizeCategoryCode = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (parsed === 90) return 40; // backward compatibility for old clients/data
  if ([10, 20, 30, 40].includes(parsed)) return parsed;
  return 10;
};

// Helper to generate unique codes
const generateStepCode = (workflowId, stepOrder) => {
  // Format: WF-XXX-01, WF-XXX-02, etc.
  const paddedOrder = String(stepOrder).padStart(2, '0');
  return `${workflowId}-${paddedOrder}`;
};

const upsertTransition = async (client, workflowId, fromStepCode, toStepCode, cancelAllowed = false) => {
  await client.query(
    `
      INSERT INTO workflow_transitions (
        workflow_id, from_step_code, to_step_code, cancel_allowed
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT ON CONSTRAINT uq_workflow_transitions
      DO UPDATE SET cancel_allowed = workflow_transitions.cancel_allowed OR EXCLUDED.cancel_allowed
    `,
    [workflowId, fromStepCode, toStepCode, cancelAllowed]
  );
};

// ----------------------------------------------------------------------
// GET all workflows with steps and transitions for Admin Panel
// ----------------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const workflowsResult = await db.query(`
      SELECT * FROM workflows
    `);
    const workflowsRows = workflowsResult.rows;

    const workflows = [];
    for (const wf of workflowsRows) {
      const stepsResult = await db.query(
        `
          SELECT ws.*,
                 CASE ws.category_code
                   WHEN 10 THEN 'Open'
                   WHEN 20 THEN 'In Progress'
                   WHEN 30 THEN 'Closed'
                   WHEN 40 THEN 'Cancelled'
                   ELSE 'Open'
                 END AS category_name
          FROM workflow_steps ws
          WHERE ws.workflow_id = $1
          ORDER BY ws.step_order
        `,
        [wf.id]
      );
      const steps = stepsResult.rows;

      // Get transitions for each step
      for (const step of steps) {
        step.workgroupCode = step.workgroup_id;
        const nextStepsResult = await db.query(
          `
            SELECT ws.step_name
            FROM workflow_transitions wt
            JOIN workflow_steps ws
              ON wt.workflow_id = ws.workflow_id AND wt.to_step_code = ws.step_code
            WHERE wt.workflow_id = $1 AND wt.from_step_code = $2
          `,
          [wf.id, step.step_code]
        );
        const nextSteps = nextStepsResult.rows.map(r => r.step_name);

        const prevStepsResult = await db.query(
          `
            SELECT ws.step_name
            FROM workflow_transitions wt
            JOIN workflow_steps ws
              ON wt.workflow_id = ws.workflow_id AND wt.from_step_code = ws.step_code
            WHERE wt.workflow_id = $1 AND wt.to_step_code = $2
          `,
          [wf.id, step.step_code]
        );
        const prevSteps = prevStepsResult.rows.map(r => r.step_name);

        step.allowedNextSteps = nextSteps;
        step.allowedPreviousSteps = prevSteps;
      }

      workflows.push({ ...wf, steps });
    }

    res.json(workflows);
  } catch (err) {
    console.error("Failed to fetch workflows:", err);
    res.status(500).json({ error: "Failed to fetch workflows" });
  }
});

// ----------------------------------------------------------------------
// GET single workflow with steps and transitions
// ----------------------------------------------------------------------
router.get("/:id", async (req, res) => {
  const workflowId = req.params.id;
  try {
    const workflowResult = await db.query(
      `SELECT * FROM workflows WHERE id = $1`,
      [workflowId]
    );
    const workflow = workflowResult.rows[0];
    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    const stepsResult = await db.query(
      `
        SELECT ws.*,
               CASE ws.category_code
                 WHEN 10 THEN 'Open'
                 WHEN 20 THEN 'In Progress'
                 WHEN 30 THEN 'Closed'
                 WHEN 40 THEN 'Cancelled'
                 ELSE 'Open'
               END AS category_name
        FROM workflow_steps ws
        WHERE ws.workflow_id = $1
        ORDER BY ws.step_order
      `,
      [workflowId]
    );
    const steps = stepsResult.rows;

    for (const step of steps) {
      step.workgroupCode = step.workgroup_id;
      const nextStepsResult = await db.query(
        `
          SELECT ws.step_name
          FROM workflow_transitions wt
          JOIN workflow_steps ws
            ON wt.workflow_id = ws.workflow_id AND wt.to_step_code = ws.step_code
          WHERE wt.workflow_id = $1 AND wt.from_step_code = $2
        `,
        [workflowId, step.step_code]
      );
      step.allowedNextSteps = nextStepsResult.rows.map(r => r.step_name);

      const prevStepsResult = await db.query(
        `
          SELECT ws.step_name
          FROM workflow_transitions wt
          JOIN workflow_steps ws
            ON wt.workflow_id = ws.workflow_id AND wt.from_step_code = ws.step_code
          WHERE wt.workflow_id = $1 AND wt.to_step_code = $2
        `,
        [workflowId, step.step_code]
      );
      step.allowedPreviousSteps = prevStepsResult.rows.map(r => r.step_name);
    }

    res.json({ ...workflow, steps });
  } catch (err) {
    console.error("Failed to fetch workflow:", err);
    res.status(500).json({ error: "Failed to fetch workflow" });
  }
});

// ----------------------------------------------------------------------
// POST create new workflow with steps and transitions
// ----------------------------------------------------------------------
router.post("/", async (req, res) => {
  const { name, steps } = req.body;

  if (!name || !steps || !Array.isArray(steps) || steps.length === 0) {
    return res.status(400).json({ error: "Invalid workflow data. Name and steps are required." });
  }

  try {
    console.log("[workflow_management] create payload:", {
      name,
      stepsCount: Array.isArray(steps) ? steps.length : 0,
      steps
    });
    const client = await db.pool.connect();
    let workflowId = null;
    try {
      await client.query("BEGIN");

      const workflowResult = await client.query(
        `
          INSERT INTO workflows (name, active, created_at, updated_at)
          VALUES ($1, true, NOW(), NOW())
          RETURNING id
        `,
        [name]
      );
      workflowId = workflowResult.rows[0].id;

      // Create steps with generated step codes
      for (const [index, step] of steps.entries()) {
        const stepCode = generateStepCode(workflowId, index + 1);
        const normalizedCategory = normalizeCategoryCode(step.categoryCode);
        step.normalizedCategory = normalizedCategory;

        await client.query(
          `
            INSERT INTO workflow_steps (
              workflow_id, step_code, step_name, step_order,
              category_code, workgroup_id
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            workflowId,
            stepCode,
            step.stepName,
            index + 1,
            normalizedCategory,
            step.workgroupId || step.workgroupCode || null,
          ]
        );

        step.stepCode = stepCode;
      }

      // Create transitions based on allowed next/previous steps
      for (const step of steps) {
        if (step.allowedNextSteps && step.allowedNextSteps.length > 0) {
          for (const nextStepName of step.allowedNextSteps) {
            const nextStep = steps.find(s => s.stepName === nextStepName);
            if (nextStep && nextStep.stepCode) {
              await upsertTransition(client, workflowId, step.stepCode, nextStep.stepCode, false);
            }
          }
        }

        if (step.allowedPreviousSteps && step.allowedPreviousSteps.length > 0) {
          for (const prevStepName of step.allowedPreviousSteps) {
            const prevStep = steps.find(s => s.stepName === prevStepName);
            if (prevStep && prevStep.stepCode) {
              await upsertTransition(client, workflowId, prevStep.stepCode, step.stepCode, false);
            }
          }
        }

        if (step.normalizedCategory === 40) {
          for (const otherStep of steps) {
            if (otherStep.stepCode && otherStep.stepCode !== step.stepCode) {
              await upsertTransition(client, workflowId, otherStep.stepCode, step.stepCode, true);
            }
          }
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    res.json({ success: true, workflowId });
  } catch (err) {
    console.error("Failed to create workflow:", err);
    res.status(500).json({ error: "Failed to create workflow", detail: err.detail || err.message });
  }
});

// ----------------------------------------------------------------------
// PATCH update existing workflow
// ----------------------------------------------------------------------
router.patch("/:id", async (req, res) => {
  const workflowId = req.params.id;
  const { name, steps } = req.body;

  if (steps === undefined && (name !== undefined)) {
    return res.status(400).json({ error: "Steps are required for workflow update." });
  }

  if (!name || !steps || !Array.isArray(steps) || steps.length === 0) {
    return res.status(400).json({ error: "Invalid workflow data" });
  }

  try {
    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `
          UPDATE workflows
          SET name = $1, updated_at = NOW()
          WHERE id = $2
        `,
        [name, workflowId]
      );

      const existingStepsResult = await client.query(
        `
          SELECT step_code, step_name FROM workflow_steps
          WHERE workflow_id = $1
        `,
        [workflowId]
      );
      const existingSteps = existingStepsResult.rows;

      for (const [index, step] of steps.entries()) {
        const existingStep = existingSteps.find(es => es.step_name === step.stepName);
        const stepCode =
          step.stepCode || existingStep?.step_code || generateStepCode(workflowId, index + 1);
        const normalizedCategory = normalizeCategoryCode(step.categoryCode);
        step.normalizedCategory = normalizedCategory;

        await client.query(
          `
            INSERT INTO workflow_steps (
              workflow_id, step_code, step_name, step_order,
              category_code, workgroup_id
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (workflow_id, step_code) DO UPDATE SET
              step_name = EXCLUDED.step_name,
              step_order = EXCLUDED.step_order,
              category_code = EXCLUDED.category_code,
              workgroup_id = EXCLUDED.workgroup_id
          `,
          [
            workflowId,
            stepCode,
            step.stepName,
            index + 1,
            normalizedCategory,
            step.workgroupId || step.workgroupCode || null,
          ]
        );

        step.stepCode = stepCode;
      }

      const currentStepCodes = steps.map(s => s.stepCode);
      if (currentStepCodes.length > 0) {
        const placeholders = currentStepCodes.map((_, i) => `$${i + 2}`).join(",");
        await client.query(
          `
            DELETE FROM workflow_steps
            WHERE workflow_id = $1 AND step_code NOT IN (${placeholders})
          `,
          [workflowId, ...currentStepCodes]
        );
      }

      await client.query(
        `
          DELETE FROM workflow_transitions
          WHERE workflow_id = $1
        `,
        [workflowId]
      );

      for (const step of steps) {
        if (step.allowedNextSteps && step.allowedNextSteps.length > 0) {
          for (const nextStepName of step.allowedNextSteps) {
            const nextStep = steps.find(s => s.stepName === nextStepName);
            if (nextStep && nextStep.stepCode) {
              await upsertTransition(client, workflowId, step.stepCode, nextStep.stepCode, false);
            }
          }
        }

        if (step.allowedPreviousSteps && step.allowedPreviousSteps.length > 0) {
          for (const prevStepName of step.allowedPreviousSteps) {
            const prevStep = steps.find(s => s.stepName === prevStepName);
            if (prevStep && prevStep.stepCode) {
              await upsertTransition(client, workflowId, prevStep.stepCode, step.stepCode, false);
            }
          }
        }

        if (step.normalizedCategory === 40) {
          for (const otherStep of steps) {
            if (otherStep.stepCode && otherStep.stepCode !== step.stepCode) {
              await upsertTransition(client, workflowId, otherStep.stepCode, step.stepCode, true);
            }
          }
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    res.json({ success: true, workflowId });
  } catch (err) {
    console.error("Failed to update workflow:", err);
    res.status(500).json({ error: "Failed to update workflow", detail: err.detail || err.message });
  }
});

// ----------------------------------------------------------------------
// PATCH toggle workflow active flag
// ----------------------------------------------------------------------
router.patch("/:id/active", async (req, res) => {
  const workflowId = req.params.id;
  const { active } = req.body;

  if (typeof active !== "boolean") {
    return res.status(400).json({ error: "active must be boolean" });
  }

  try {
    await db.query(
      `
        UPDATE workflows
        SET active = $1, updated_at = NOW()
        WHERE id = $2
      `,
      [active, workflowId]
    );
    res.json({ success: true, id: workflowId, active });
  } catch (err) {
    console.error("Failed to toggle workflow active:", err);
    res.status(500).json({ error: "Failed to toggle workflow active" });
  }
});

// ----------------------------------------------------------------------
// DELETE workflow
// ----------------------------------------------------------------------
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Soft delete by setting active = 0
    await db.query(
      `
        UPDATE workflows
        SET active = false, updated_at = NOW()
        WHERE id = $1
      `,
      [id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete workflow:", err);
    res.status(500).json({ error: "Failed to delete workflow" });
  }
});

module.exports = router;
