const db = require("../db/db");

const CLOSED_CATEGORY_CODE = 30;
const CANCELLED_CATEGORY_CODE = 40;
const TERMINAL_CATEGORY_CODES = new Set([
  CLOSED_CATEGORY_CODE,
  CANCELLED_CATEGORY_CODE,
]);

const isTerminalCategoryCode = (categoryCode) =>
  TERMINAL_CATEGORY_CODES.has(Number(categoryCode));

const parseDateOnly = (value) => {
  if (!value) return null;

  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
    );
  }

  const rawValue = String(value).trim();
  if (!rawValue) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    const [year, month, day] = rawValue.split("-").map((piece) => Number.parseInt(piece, 10));
    return new Date(Date.UTC(year, month - 1, day));
  }

  const parsed = new Date(rawValue);
  if (!Number.isFinite(parsed.getTime())) return null;

  return new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())
  );
};

const toIsoDate = (dateValue) => {
  if (!(dateValue instanceof Date) || !Number.isFinite(dateValue.getTime())) {
    return null;
  }
  return dateValue.toISOString().slice(0, 10);
};

const compareDateOnly = (left, right) => {
  const leftMs = left?.getTime?.();
  const rightMs = right?.getTime?.();

  if (!Number.isFinite(leftMs) || !Number.isFinite(rightMs)) return 0;
  if (leftMs < rightMs) return -1;
  if (leftMs > rightMs) return 1;
  return 0;
};

const calculateWorkflowSlaDays = async (workflowId, executor = db) => {
  if (!workflowId) return null;

  const workflowResult = await executor.query(
    `
      SELECT sla_enabled
      FROM workflows
      WHERE id = $1
      LIMIT 1
    `,
    [workflowId]
  );
  const workflow = workflowResult.rows[0];

  if (!workflow || !workflow.sla_enabled) {
    return null;
  }

  const totalResult = await executor.query(
    `
      SELECT COALESCE(SUM(ws.sla_days), 0)::int AS total_sla_days
      FROM workflow_steps ws
      WHERE ws.workflow_id = $1
        AND ws.deleted_at IS NULL
        AND ws.category_code NOT IN (${CLOSED_CATEGORY_CODE}, ${CANCELLED_CATEGORY_CODE})
        AND ws.sla_days IS NOT NULL
    `,
    [workflowId]
  );

  return Number(totalResult.rows[0]?.total_sla_days || 0);
};

const calculateTicketDueDate = async (createdAt, workflowId, executor = db) => {
  const totalSlaDays = await calculateWorkflowSlaDays(workflowId, executor);
  if (totalSlaDays === null) {
    return null;
  }

  const baseDate = parseDateOnly(createdAt || new Date());
  if (!baseDate) return null;

  baseDate.setUTCDate(baseDate.getUTCDate() + totalSlaDays);
  return toIsoDate(baseDate);
};

const determineTicketSlaStatus = ({
  dueDate,
  workflowSlaEnabled,
  stepCategoryCode,
  completedAt,
  now = new Date(),
}) => {
  if (workflowSlaEnabled === false) {
    return "no_sla";
  }

  const normalizedDueDate = parseDateOnly(dueDate);
  if (!normalizedDueDate) {
    return "no_sla";
  }

  const normalizedNow = parseDateOnly(now) || parseDateOnly(new Date());
  const normalizedCompletedAt = parseDateOnly(completedAt);
  const categoryCode = Number(stepCategoryCode);
  const isTerminal = isTerminalCategoryCode(categoryCode);
  const hasCompletionTimestamp = Boolean(normalizedCompletedAt);

  if (hasCompletionTimestamp) {
    return compareDateOnly(normalizedCompletedAt, normalizedDueDate) <= 0
      ? "closed_in_time"
      : "closed_late";
  }

  if (isTerminal) {
    return "closed_in_time";
  }

  const baselineDate = normalizedNow;

  const comparison = compareDateOnly(baselineDate, normalizedDueDate);
  if (comparison < 0) return "on_time";
  if (comparison === 0) return "due_today";
  return "overdue";
};

const recalculateOpenTicketsDueDatesForWorkflow = async (
  workflowId,
  executor = db
) => {
  if (!workflowId) return { updatedCount: 0, totalSlaDays: null };

  const totalSlaDays = await calculateWorkflowSlaDays(workflowId, executor);

  if (totalSlaDays === null) {
    const clearResult = await executor.query(
      `
        UPDATE tickets t
        SET due_date = NULL,
            updated_at = NOW()
        FROM workflow_steps ws
        WHERE t.workflow_id = $1
          AND t.deleted_at IS NULL
          AND ws.workflow_id = t.workflow_id
          AND ws.step_code = t.step_code
          AND ws.deleted_at IS NULL
          AND ws.category_code NOT IN (${CLOSED_CATEGORY_CODE}, ${CANCELLED_CATEGORY_CODE})
      `,
      [workflowId]
    );

    return { updatedCount: clearResult.rowCount || 0, totalSlaDays: null };
  }

  const recalcResult = await executor.query(
    `
      UPDATE tickets t
      SET due_date = (
            COALESCE(t.initiate_date, t.created_at)::date
            + ($2::int * INTERVAL '1 day')
          )::date,
          updated_at = NOW()
      FROM workflow_steps ws
      WHERE t.workflow_id = $1
        AND t.deleted_at IS NULL
        AND ws.workflow_id = t.workflow_id
        AND ws.step_code = t.step_code
        AND ws.deleted_at IS NULL
        AND ws.category_code NOT IN (${CLOSED_CATEGORY_CODE}, ${CANCELLED_CATEGORY_CODE})
    `,
    [workflowId, totalSlaDays]
  );

  return { updatedCount: recalcResult.rowCount || 0, totalSlaDays };
};

module.exports = {
  CLOSED_CATEGORY_CODE,
  CANCELLED_CATEGORY_CODE,
  TERMINAL_CATEGORY_CODES,
  isTerminalCategoryCode,
  calculateWorkflowSlaDays,
  calculateTicketDueDate,
  determineTicketSlaStatus,
  recalculateOpenTicketsDueDatesForWorkflow,
};
