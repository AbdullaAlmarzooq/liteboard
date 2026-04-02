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

const CATEGORY_NAME_SQL = `
  CASE ws.category_code
    WHEN 10 THEN 'Open'
    WHEN 20 THEN 'In Progress'
    WHEN 30 THEN 'Closed'
    WHEN 40 THEN 'Cancelled'
    ELSE 'Open'
  END
`;

const attachTransitionsToSteps = (stepsRows, transitionRows) => {
  const stepMap = new Map();
  const steps = stepsRows.map((step) => {
    const hydratedStep = {
      ...step,
      workgroupCode: step.workgroup_id,
      allowedNextSteps: [],
      allowedPreviousSteps: [],
    };

    stepMap.set(step.step_code, hydratedStep);
    return hydratedStep;
  });

  for (const transition of transitionRows) {
    const fromStep = stepMap.get(transition.from_step_code);
    const toStep = stepMap.get(transition.to_step_code);

    if (fromStep && transition.to_step_name) {
      fromStep.allowedNextSteps.push(transition.to_step_name);
    }

    if (toStep && transition.from_step_name) {
      toStep.allowedPreviousSteps.push(transition.from_step_name);
    }
  }

  return steps;
};

const fetchWorkflowSteps = async (workflowIds) => {
  if (!workflowIds.length) {
    return [];
  }

  const { rows } = await db.query(
    `
      SELECT
        ws.*,
        ${CATEGORY_NAME_SQL} AS category_name
      FROM workflow_steps ws
      WHERE ws.workflow_id = ANY($1::uuid[])
      ORDER BY ws.workflow_id, ws.step_order
    `,
    [workflowIds]
  );

  return rows;
};

const fetchWorkflowTransitions = async (workflowIds) => {
  if (!workflowIds.length) {
    return [];
  }

  const { rows } = await db.query(
    `
      SELECT
        wt.workflow_id,
        wt.from_step_code,
        wt.to_step_code,
        from_ws.step_name AS from_step_name,
        to_ws.step_name AS to_step_name
      FROM workflow_transitions wt
      JOIN workflow_steps from_ws
        ON from_ws.workflow_id = wt.workflow_id
       AND from_ws.step_code = wt.from_step_code
      JOIN workflow_steps to_ws
        ON to_ws.workflow_id = wt.workflow_id
       AND to_ws.step_code = wt.to_step_code
      WHERE wt.workflow_id = ANY($1::uuid[])
      ORDER BY wt.workflow_id, from_ws.step_order, to_ws.step_order
    `,
    [workflowIds]
  );

  return rows;
};

const buildWorkflowDetails = (workflowRows, stepsRows, transitionRows) => {
  const stepsByWorkflow = new Map();
  for (const step of stepsRows) {
    const existing = stepsByWorkflow.get(step.workflow_id) || [];
    existing.push(step);
    stepsByWorkflow.set(step.workflow_id, existing);
  }

  const transitionsByWorkflow = new Map();
  for (const transition of transitionRows) {
    const existing = transitionsByWorkflow.get(transition.workflow_id) || [];
    existing.push(transition);
    transitionsByWorkflow.set(transition.workflow_id, existing);
  }

  return workflowRows.map((workflow) => ({
    ...workflow,
    steps: attachTransitionsToSteps(
      stepsByWorkflow.get(workflow.id) || [],
      transitionsByWorkflow.get(workflow.id) || []
    ),
  }));
};

// ----------------------------------------------------------------------
// GET workflow summaries for Admin Panel list view
// ----------------------------------------------------------------------
router.get("/list", async (req, res) => {
  try {
    const { rows } = await db.query(
      `
        SELECT
          w.id,
          w.name,
          w.active,
          COUNT(ws.step_code)::int AS step_count
        FROM workflows w
        LEFT JOIN workflow_steps ws
          ON ws.workflow_id = w.id
        GROUP BY w.id, w.name, w.active
        ORDER BY w.name ASC, w.id ASC
      `
    );

    res.json(rows);
  } catch (err) {
    console.error("Failed to fetch workflow summaries:", err);
    res.status(500).json({ error: "Failed to fetch workflow summaries" });
  }
});

// ----------------------------------------------------------------------
// GET all workflows with steps and transitions for Admin Panel
// ----------------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const workflowsResult = await db.query(`
      SELECT * FROM workflows
      ORDER BY name ASC, id ASC
    `);
    const workflowRows = workflowsResult.rows;
    const workflowIds = workflowRows.map((workflow) => workflow.id);

    const [stepsRows, transitionRows] = await Promise.all([
      fetchWorkflowSteps(workflowIds),
      fetchWorkflowTransitions(workflowIds),
    ]);

    res.json(buildWorkflowDetails(workflowRows, stepsRows, transitionRows));
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

    const [stepsRows, transitionRows] = await Promise.all([
      fetchWorkflowSteps([workflowId]),
      fetchWorkflowTransitions([workflowId]),
    ]);

    const [workflowDetail] = buildWorkflowDetails([workflow], stepsRows, transitionRows);
    res.json(workflowDetail);
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
