// server/features/workflows/workflows.service.js

const db = require("../../db/db");
const { getProjectAccess } = require("../../utils/projectAccess");
const { buildAdminChangePayload, createAdminEvent } = require("../../utils/events");
const {
  CLOSED_CATEGORY_CODE,
  CANCELLED_CATEGORY_CODE,
  recalculateOpenTicketsDueDatesForWorkflow,
} = require("../../utils/sla");

class WorkflowsServiceError extends Error {
  constructor(status, body, code = "WORKFLOWS_SERVICE_ERROR") {
    const normalizedBody = typeof body === "string" ? { error: body } : body;
    super(normalizedBody?.error || "Workflows service error");
    this.name = "WorkflowsServiceError";
    this.status = status;
    this.code = code;
    this.body = normalizedBody || { error: this.message };
  }
}

const createServiceError = (status, body, code) =>
  new WorkflowsServiceError(status, body, code);

const isWorkflowsServiceError = (error) => error instanceof WorkflowsServiceError;

const getAdminEventActor = (user) => ({
  id: user?.id || null,
  name: user?.name || null,
});

const normalizeCategoryCode = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (parsed === 90) return 40; // backward compatibility for old clients/data
  if ([10, 20, 30, 40].includes(parsed)) return parsed;
  return 10;
};

const createValidationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const normalizeSlaEnabled = (value) => value === true;

const normalizeSlaDays = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return Number.NaN;
  return parsed;
};

const normalizeWorkflowStepsForSave = (steps, slaEnabled) =>
  steps.map((rawStep, index) => {
    const stepName = String(rawStep.stepName || rawStep.step_name || "").trim();
    const normalizedCategory = normalizeCategoryCode(
      rawStep.categoryCode ?? rawStep.category_code
    );
    const parsedSlaDays = normalizeSlaDays(rawStep.slaDays ?? rawStep.sla_days);

    if (Number.isNaN(parsedSlaDays)) {
      throw createValidationError(
        `SLA days for step "${stepName || `#${index + 1}`}" must be a whole number.`
      );
    }

    if (
      normalizedCategory === CLOSED_CATEGORY_CODE ||
      normalizedCategory === CANCELLED_CATEGORY_CODE
    ) {
      if (parsedSlaDays !== null) {
        throw createValidationError(
          `Closed/Cancelled step "${stepName || `#${index + 1}`}" cannot have SLA days.`
        );
      }

      return {
        ...rawStep,
        stepName,
        normalizedCategory,
        normalizedSlaDays: null,
      };
    }

    if (!slaEnabled) {
      return {
        ...rawStep,
        stepName,
        normalizedCategory,
        normalizedSlaDays: null,
      };
    }

    if (parsedSlaDays === null) {
      throw createValidationError(
        `SLA days are required for active step "${stepName || `#${index + 1}`}" when SLA is enabled.`
      );
    }

    if (parsedSlaDays < 1 || parsedSlaDays > 99) {
      throw createValidationError(
        `SLA days for step "${stepName || `#${index + 1}`}" must be between 1 and 99.`
      );
    }

    return {
      ...rawStep,
      stepName,
      normalizedCategory,
      normalizedSlaDays: parsedSlaDays,
    };
  });

const generateStepCode = (workflowId, stepOrder) => {
  const paddedOrder = String(stepOrder).padStart(2, "0");
  return `${workflowId}-${paddedOrder}`;
};

const upsertTransition = async (
  client,
  workflowId,
  fromStepCode,
  toStepCode,
  cancelAllowed = false
) => {
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

const workflowStepEventId = (workflowId, stepCode) => `${workflowId}:${stepCode}`;

const getWorkflowSnapshot = async (executor, workflowId) => {
  const workflowResult = await executor.query(
    `
      SELECT id, name, description, active, sla_enabled
      FROM workflows
      WHERE id = $1
      LIMIT 1
    `,
    [workflowId]
  );
  const workflow = workflowResult.rows[0];
  if (!workflow) return null;

  const stepsResult = await executor.query(
    `
      SELECT step_code, step_name, step_order, category_code, workgroup_id, description, sla_days
      FROM workflow_steps
      WHERE workflow_id = $1
      ORDER BY step_order ASC
    `,
    [workflowId]
  );

  return {
    ...workflow,
    steps: stepsResult.rows,
  };
};

const logWorkflowStepEvents = async (
  client,
  user,
  workflowId,
  workflowName,
  beforeSteps,
  afterSteps
) => {
  const beforeByCode = new Map((beforeSteps || []).map((step) => [step.step_code, step]));
  const afterByCode = new Map((afterSteps || []).map((step) => [step.step_code, step]));

  for (const afterStep of afterSteps || []) {
    const beforeStep = beforeByCode.get(afterStep.step_code);

    if (!beforeStep) {
      await createAdminEvent(client, {
        actor: getAdminEventActor(user),
        entity: "workflow_step",
        action: "created",
        entityId: workflowStepEventId(workflowId, afterStep.step_code),
        entityName: afterStep.step_name,
        after: {
          workflow_id: workflowId,
          workflow_name: workflowName,
          ...afterStep,
        },
      });
      continue;
    }

    const { changes, before, after } = buildAdminChangePayload(beforeStep, afterStep, {
      fields: ["step_name", "step_order", "category_code", "workgroup_id", "sla_days"],
      fieldLabels: {
        step_name: "Step Name",
        step_order: "Step Order",
        category_code: "Category",
        workgroup_id: "Workgroup",
        sla_days: "SLA Days",
      },
    });

    if (changes.length > 0) {
      await createAdminEvent(client, {
        actor: getAdminEventActor(user),
        entity: "workflow_step",
        action: "updated",
        entityId: workflowStepEventId(workflowId, afterStep.step_code),
        entityName: afterStep.step_name,
        changes,
        before: {
          workflow_id: workflowId,
          workflow_name: workflowName,
          ...before,
        },
        after: {
          workflow_id: workflowId,
          workflow_name: workflowName,
          ...after,
        },
      });
    }
  }

  for (const beforeStep of beforeSteps || []) {
    if (afterByCode.has(beforeStep.step_code)) continue;

    await createAdminEvent(client, {
      actor: getAdminEventActor(user),
      entity: "workflow_step",
      action: "deleted",
      entityId: workflowStepEventId(workflowId, beforeStep.step_code),
      entityName: beforeStep.step_name,
      before: {
        workflow_id: workflowId,
        workflow_name: workflowName,
        ...beforeStep,
      },
    });
  }
};

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

const mapWorkflowRows = (rows) => {
  const workflowsMap = {};
  rows.forEach((row) => {
    if (!workflowsMap[row.workflow_id]) {
      workflowsMap[row.workflow_id] = {
        id: row.workflow_id,
        name: row.name,
        description: row.description,
        active: row.active,
        sla_enabled: row.sla_enabled,
        created_at: row.created_at,
        updated_at: row.updated_at,
        steps: [],
      };
    }

    if (row.step_id) {
      workflowsMap[row.workflow_id].steps.push({
        id: row.step_id,
        stepCode: row.step_code,
        stepName: row.step_name,
        stepOrder: row.step_order,
        slaDays: row.sla_days,
        workgroupId: row.workgroup_id,
        workgroupCode: row.workgroup_id,
        workgroupName: row.workgroup_name,
      });
    }
  });

  return Object.values(workflowsMap);
};

const getActiveWorkflows = async ({ projectId, user }) => {
  if (projectId) {
    const projectAccess = await getProjectAccess(user, projectId, {
      requireActiveForNonAdmin: true,
    });

    if (projectAccess.status !== 200) {
      throw createServiceError(
        projectAccess.status,
        { error: projectAccess.message },
        "PROJECT_ACCESS_ERROR"
      );
    }
  }

  const params = [];
  let projectJoin = "";
  let projectWhere = "";

  if (projectId) {
    params.push(projectId);
    projectJoin = `
        JOIN project_workflows pw
          ON pw.workflow_id = w.id
      `;
    projectWhere = ` AND pw.project_id = $${params.length}`;
  }

  const query = `
    SELECT 
      w.id AS workflow_id,
      w.name,
      w.description,
      w.active,
      w.sla_enabled,
      w.created_at,
      w.updated_at,
      ws.id AS step_id,
      ws.step_code,
      ws.step_name,
      ws.step_order,
      ws.sla_days,
      ws.workgroup_id,
      wg.name AS workgroup_name
    FROM workflows w
    ${projectJoin}
    LEFT JOIN workflow_steps ws ON w.id = ws.workflow_id
    LEFT JOIN workgroups wg ON ws.workgroup_id = wg.id
    WHERE w.active = true
    ${projectWhere}
    ORDER BY w.id, ws.step_order
  `;
  const { rows } = await db.query(query, params);

  return mapWorkflowRows(rows);
};

const getActiveWorkflowById = async ({ id }) => {
  const query = `
    SELECT 
      w.id AS workflow_id,
      w.name,
      w.description,
      w.active,
      w.sla_enabled,
      w.created_at,
      w.updated_at,
      ws.id AS step_id,
      ws.step_code,
      ws.step_name,
      ws.step_order,
      ws.sla_days,
      ws.workgroup_id,
      wg.name AS workgroup_name
    FROM workflows w
    LEFT JOIN workflow_steps ws ON w.id = ws.workflow_id
    LEFT JOIN workgroups wg ON ws.workgroup_id = wg.id
    WHERE w.id = $1 AND w.active = true
    ORDER BY ws.step_order
  `;

  const { rows } = await db.query(query, [id]);

  if (!rows.length) {
    throw createServiceError(
      404,
      { error: "Workflow not found or inactive" },
      "NOT_FOUND"
    );
  }

  const [workflow] = mapWorkflowRows(rows);
  return workflow;
};

const getAllowedStepsForTicket = async ({ ticketId }) => {
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
    throw createServiceError(
      404,
      { error: "Ticket not found or query failed" },
      "NOT_FOUND"
    );
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

  return rows;
};

const getWorkflowTransitions = async ({ workflowId }) => {
  let query = "SELECT * FROM workflow_transitions";
  const params = [];

  if (workflowId) {
    query += " WHERE workflow_id = $1";
    params.push(workflowId);
  }

  const { rows } = await db.query(query, params);
  return rows;
};

const getWorkflowTransitionsForStep = async ({ stepCode }) => {
  const { rows } = await db.query(
    "SELECT * FROM workflow_transitions WHERE from_step_code = $1",
    [stepCode]
  );
  return rows;
};

const updateWorkflowTransition = async ({ id, body }) => {
  const { from_step_code, to_step_code, workflow_id, cancel_allowed } = body;

  await db.query(
    `UPDATE workflow_transitions 
       SET from_step_code = $1, to_step_code = $2, workflow_id = $3, cancel_allowed = $4 
       WHERE id = $5`,
    [from_step_code, to_step_code, workflow_id, !!cancel_allowed, id]
  );

  const { rows } = await db.query("SELECT * FROM workflow_transitions WHERE id = $1", [id]);
  return rows[0];
};

const createWorkflowTransition = async ({ body }) => {
  const { from_step_code, to_step_code, workflow_id, cancel_allowed } = body;

  const result = await db.query(
    `INSERT INTO workflow_transitions (workflow_id, from_step_code, to_step_code, cancel_allowed)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
    [workflow_id, from_step_code, to_step_code, !!cancel_allowed]
  );

  const { rows } = await db.query("SELECT * FROM workflow_transitions WHERE id = $1", [result.rows[0].id]);
  return rows[0];
};

const deleteWorkflowTransition = async ({ id }) => {
  await db.query("DELETE FROM workflow_transitions WHERE id = $1", [id]);
  return { success: true };
};

const getWorkflowSummaries = async () => {
  const { rows } = await db.query(
    `
        SELECT
          w.id,
          w.name,
          w.active,
          w.sla_enabled,
          COUNT(ws.step_code)::int AS step_count,
          COALESCE(
            SUM(
              CASE
                WHEN ws.category_code NOT IN (${CLOSED_CATEGORY_CODE}, ${CANCELLED_CATEGORY_CODE})
                THEN ws.sla_days
                ELSE 0
              END
            ),
            0
          )::int AS total_sla_days
        FROM workflows w
        LEFT JOIN workflow_steps ws
          ON ws.workflow_id = w.id
        GROUP BY w.id, w.name, w.active, w.sla_enabled
        ORDER BY w.name ASC, w.id ASC
      `
  );

  return rows;
};

const getManagedWorkflows = async () => {
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

  return buildWorkflowDetails(workflowRows, stepsRows, transitionRows);
};

const getManagedWorkflowById = async ({ id }) => {
  const workflowResult = await db.query(
    "SELECT * FROM workflows WHERE id = $1",
    [id]
  );
  const workflow = workflowResult.rows[0];
  if (!workflow) {
    throw createServiceError(404, { error: "Workflow not found" }, "NOT_FOUND");
  }

  const [stepsRows, transitionRows] = await Promise.all([
    fetchWorkflowSteps([id]),
    fetchWorkflowTransitions([id]),
  ]);

  const [workflowDetail] = buildWorkflowDetails([workflow], stepsRows, transitionRows);
  return workflowDetail;
};

const createManagedWorkflow = async ({ body, user }) => {
  const { name, steps, slaEnabled } = body;

  if (!name || !steps || !Array.isArray(steps) || steps.length === 0) {
    throw createServiceError(
      400,
      { error: "Invalid workflow data. Name and steps are required." },
      "VALIDATION_ERROR"
    );
  }

  const normalizedSlaEnabled = normalizeSlaEnabled(slaEnabled);
  const normalizedSteps = normalizeWorkflowStepsForSave(steps, normalizedSlaEnabled);

  console.log("[workflow_management] create payload:", {
    name,
    slaEnabled: normalizedSlaEnabled,
    stepsCount: Array.isArray(steps) ? steps.length : 0,
    steps: normalizedSteps,
  });

  const client = await db.pool.connect();
  let workflowId = null;
  try {
    await client.query("BEGIN");

    const workflowResult = await client.query(
      `
          INSERT INTO workflows (name, active, sla_enabled, created_at, updated_at)
          VALUES ($1, true, $2, NOW(), NOW())
          RETURNING id
        `,
      [name, normalizedSlaEnabled]
    );
    workflowId = workflowResult.rows[0].id;

    for (const [index, step] of normalizedSteps.entries()) {
      const stepCode = generateStepCode(workflowId, index + 1);

      await client.query(
        `
            INSERT INTO workflow_steps (
              workflow_id, step_code, step_name, step_order,
              category_code, workgroup_id, sla_days
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
        [
          workflowId,
          stepCode,
          step.stepName,
          index + 1,
          step.normalizedCategory,
          step.workgroupId || step.workgroupCode || null,
          step.normalizedSlaDays,
        ]
      );

      step.stepCode = stepCode;
    }

    for (const step of normalizedSteps) {
      if (step.allowedNextSteps && step.allowedNextSteps.length > 0) {
        for (const nextStepName of step.allowedNextSteps) {
          const nextStep = normalizedSteps.find((s) => s.stepName === nextStepName);
          if (nextStep && nextStep.stepCode) {
            await upsertTransition(client, workflowId, step.stepCode, nextStep.stepCode, false);
          }
        }
      }

      if (step.allowedPreviousSteps && step.allowedPreviousSteps.length > 0) {
        for (const prevStepName of step.allowedPreviousSteps) {
          const prevStep = normalizedSteps.find((s) => s.stepName === prevStepName);
          if (prevStep && prevStep.stepCode) {
            await upsertTransition(client, workflowId, prevStep.stepCode, step.stepCode, false);
          }
        }
      }

      if (step.normalizedCategory === 40) {
        for (const otherStep of normalizedSteps) {
          if (otherStep.stepCode && otherStep.stepCode !== step.stepCode) {
            await upsertTransition(client, workflowId, otherStep.stepCode, step.stepCode, true);
          }
        }
      }
    }

    await recalculateOpenTicketsDueDatesForWorkflow(workflowId, client);

    const afterSteps = normalizedSteps.map((step, index) => ({
      step_code: step.stepCode,
      step_name: step.stepName,
      step_order: index + 1,
      category_code: step.normalizedCategory,
      workgroup_id: step.workgroupId || step.workgroupCode || null,
      sla_days: step.normalizedSlaDays,
    }));

    await createAdminEvent(client, {
      actor: getAdminEventActor(user),
      entity: "workflow",
      action: "created",
      entityId: workflowId,
      entityName: name,
      after: {
        id: workflowId,
        name,
        active: true,
        sla_enabled: normalizedSlaEnabled,
        steps: afterSteps,
      },
    });

    await logWorkflowStepEvents(client, user, workflowId, name, [], afterSteps);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return { success: true, workflowId };
};

const updateManagedWorkflow = async ({ id, body, user }) => {
  const workflowId = id;
  const { name, steps, slaEnabled } = body;

  if (steps === undefined && name !== undefined) {
    throw createServiceError(
      400,
      { error: "Steps are required for workflow update." },
      "VALIDATION_ERROR"
    );
  }

  if (!name || !steps || !Array.isArray(steps) || steps.length === 0) {
    throw createServiceError(
      400,
      { error: "Invalid workflow data" },
      "VALIDATION_ERROR"
    );
  }

  const existingWorkflow = await getWorkflowSnapshot(db, workflowId);
  if (!existingWorkflow) {
    throw createServiceError(404, { error: "Workflow not found" }, "NOT_FOUND");
  }

  const normalizedSlaEnabled =
    slaEnabled === undefined
      ? Boolean(existingWorkflow.sla_enabled)
      : normalizeSlaEnabled(slaEnabled);
  const normalizedSteps = normalizeWorkflowStepsForSave(steps, normalizedSlaEnabled);

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `
          UPDATE workflows
          SET name = $1, sla_enabled = $2, updated_at = NOW()
          WHERE id = $3
        `,
      [name, normalizedSlaEnabled, workflowId]
    );

    const existingStepsResult = await client.query(
      `
          SELECT step_code, step_name, step_order, category_code, workgroup_id, description, sla_days
          FROM workflow_steps
          WHERE workflow_id = $1
        `,
      [workflowId]
    );
    const existingSteps = existingStepsResult.rows;

    for (const [index, step] of normalizedSteps.entries()) {
      const existingStep = existingSteps.find((es) => es.step_name === step.stepName);
      const stepCode =
        step.stepCode || existingStep?.step_code || generateStepCode(workflowId, index + 1);

      await client.query(
        `
            INSERT INTO workflow_steps (
              workflow_id, step_code, step_name, step_order,
              category_code, workgroup_id, sla_days
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (workflow_id, step_code) DO UPDATE SET
              step_name = EXCLUDED.step_name,
              step_order = EXCLUDED.step_order,
              category_code = EXCLUDED.category_code,
              workgroup_id = EXCLUDED.workgroup_id,
              sla_days = EXCLUDED.sla_days
          `,
        [
          workflowId,
          stepCode,
          step.stepName,
          index + 1,
          step.normalizedCategory,
          step.workgroupId || step.workgroupCode || null,
          step.normalizedSlaDays,
        ]
      );

      step.stepCode = stepCode;
    }

    const currentStepCodes = normalizedSteps.map((s) => s.stepCode);
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

    for (const step of normalizedSteps) {
      if (step.allowedNextSteps && step.allowedNextSteps.length > 0) {
        for (const nextStepName of step.allowedNextSteps) {
          const nextStep = normalizedSteps.find((s) => s.stepName === nextStepName);
          if (nextStep && nextStep.stepCode) {
            await upsertTransition(client, workflowId, step.stepCode, nextStep.stepCode, false);
          }
        }
      }

      if (step.allowedPreviousSteps && step.allowedPreviousSteps.length > 0) {
        for (const prevStepName of step.allowedPreviousSteps) {
          const prevStep = normalizedSteps.find((s) => s.stepName === prevStepName);
          if (prevStep && prevStep.stepCode) {
            await upsertTransition(client, workflowId, prevStep.stepCode, step.stepCode, false);
          }
        }
      }

      if (step.normalizedCategory === 40) {
        for (const otherStep of normalizedSteps) {
          if (otherStep.stepCode && otherStep.stepCode !== step.stepCode) {
            await upsertTransition(client, workflowId, otherStep.stepCode, step.stepCode, true);
          }
        }
      }
    }

    await recalculateOpenTicketsDueDatesForWorkflow(workflowId, client);

    const afterSteps = normalizedSteps.map((step, index) => ({
      step_code: step.stepCode,
      step_name: step.stepName,
      step_order: index + 1,
      category_code: step.normalizedCategory,
      workgroup_id: step.workgroupId || step.workgroupCode || null,
      sla_days: step.normalizedSlaDays,
    }));
    const afterWorkflow = {
      ...existingWorkflow,
      name,
      sla_enabled: normalizedSlaEnabled,
      steps: afterSteps,
    };
    const { changes, before, after } = buildAdminChangePayload(existingWorkflow, afterWorkflow, {
      fields: ["name", "sla_enabled"],
      fieldLabels: {
        name: "Name",
        sla_enabled: "SLA Enabled",
      },
    });

    if (changes.length > 0) {
      await createAdminEvent(client, {
        actor: getAdminEventActor(user),
        entity: "workflow",
        action: "updated",
        entityId: workflowId,
        entityName: afterWorkflow.name,
        changes,
        before,
        after,
      });
    }

    await logWorkflowStepEvents(
      client,
      user,
      workflowId,
      afterWorkflow.name,
      existingWorkflow.steps,
      afterSteps
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return { success: true, workflowId };
};

const setWorkflowActive = async ({ id, body, user }) => {
  const workflowId = id;
  const { active } = body;

  if (typeof active !== "boolean") {
    throw createServiceError(
      400,
      { error: "active must be boolean" },
      "VALIDATION_ERROR"
    );
  }

  const beforeWorkflow = await getWorkflowSnapshot(db, workflowId);
  if (!beforeWorkflow) {
    throw createServiceError(404, { error: "Workflow not found" }, "NOT_FOUND");
  }

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `
          UPDATE workflows
          SET active = $1, updated_at = NOW()
          WHERE id = $2
        `,
      [active, workflowId]
    );

    if (beforeWorkflow.active !== active) {
      await createAdminEvent(client, {
        actor: getAdminEventActor(user),
        entity: "workflow",
        action: active ? "activated" : "deactivated",
        entityId: workflowId,
        entityName: beforeWorkflow.name,
        changes: [{
          field: "active",
          label: "Active",
          old_value: beforeWorkflow.active,
          new_value: active,
        }],
        before: beforeWorkflow,
        after: {
          ...beforeWorkflow,
          active,
        },
      });
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return { success: true, id: workflowId, active };
};

const deleteManagedWorkflow = async ({ id, user }) => {
  const beforeWorkflow = await getWorkflowSnapshot(db, id);
  if (!beforeWorkflow) {
    throw createServiceError(404, { error: "Workflow not found" }, "NOT_FOUND");
  }

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `
          UPDATE workflows
          SET active = false, updated_at = NOW()
          WHERE id = $1
        `,
      [id]
    );

    await createAdminEvent(client, {
      actor: getAdminEventActor(user),
      entity: "workflow",
      action: "deleted",
      entityId: id,
      entityName: beforeWorkflow.name,
      before: beforeWorkflow,
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return { success: true };
};

module.exports = {
  WorkflowsServiceError,
  isWorkflowsServiceError,
  getActiveWorkflows,
  getActiveWorkflowById,
  getAllowedStepsForTicket,
  getWorkflowTransitions,
  getWorkflowTransitionsForStep,
  updateWorkflowTransition,
  createWorkflowTransition,
  deleteWorkflowTransition,
  getWorkflowSummaries,
  getManagedWorkflows,
  getManagedWorkflowById,
  createManagedWorkflow,
  updateManagedWorkflow,
  setWorkflowActive,
  deleteManagedWorkflow,
};
