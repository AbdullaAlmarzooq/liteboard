// server/features/tickets/status-history.service.js

const db = require("../../db/db");
const { getReadableTicketAccess } = require("../../utils/projectAccess");

class StatusHistoryServiceError extends Error {
  constructor(status, body, code = "STATUS_HISTORY_SERVICE_ERROR") {
    const normalizedBody = typeof body === "string" ? { error: body } : body;
    super(normalizedBody?.error || "Status history service error");
    this.name = "StatusHistoryServiceError";
    this.status = status;
    this.code = code;
    this.body = normalizedBody || { error: this.message };
  }
}

const createServiceError = (status, body, code) =>
  new StatusHistoryServiceError(status, body, code);

const isStatusHistoryServiceError = (error) =>
  error instanceof StatusHistoryServiceError;

const resolveTicketId = async (ticketId) => {
  const { rows } = await db.query(
    "SELECT id FROM tickets WHERE (id::text = $1 OR ticket_code = $1) AND deleted_at IS NULL",
    [ticketId]
  );
  return rows[0]?.id || null;
};

const getStatusHistory = async ({ ticketId, user }) => {
  if (!ticketId) {
    throw createServiceError(
      400,
      { error: "ticketId query parameter is required" },
      "VALIDATION_ERROR"
    );
  }

  const access = await getReadableTicketAccess(user, ticketId);
  if (!access.ticketId) {
    throw createServiceError(access.status, { error: access.message }, "ACCESS_ERROR");
  }

  const historyQuery = `
    SELECT
      sh.id,
      sh.ticket_id,
      sh.activity_type,
      sh.field_name,
      sh.old_value,
      sh.new_value,
      sh.created_at,
      COALESCE(e.name, sh.changed_by::TEXT) AS changed_by_name
    FROM status_history sh
    LEFT JOIN employees e ON sh.changed_by = e.id
    WHERE sh.ticket_id = $1
    ORDER BY sh.created_at ASC
  `;

  const { rows } = await db.query(historyQuery, [access.ticketId]);

  return rows.map((row) => ({
    id: row.id,
    ticket_id: row.ticket_id,
    type: row.activity_type,
    fieldName: row.field_name,
    oldValue: row.old_value,
    newValue: row.new_value,
    timestamp: row.created_at,
    changedBy: row.changed_by_name,
  }));
};

const createStatusHistoryRecord = async ({ body }) => {
  const { ticket_id, activity_type, field_name, old_value, new_value, changed_by } = body;

  if (!ticket_id || !activity_type || !changed_by) {
    throw createServiceError(
      400,
      { error: "ticket_id, activity_type, and changed_by are required" },
      "VALIDATION_ERROR"
    );
  }

  const resolvedTicketId = await resolveTicketId(ticket_id);
  if (!resolvedTicketId) {
    throw createServiceError(404, { error: "Ticket not found" }, "NOT_FOUND");
  }

  const result = await db.query(
    `
      INSERT INTO status_history
        (ticket_id, activity_type, field_name, old_value, new_value, changed_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id
    `,
    [resolvedTicketId, activity_type, field_name || null, old_value, new_value, changed_by]
  );

  return {
    message: "History record created",
    id: result.rows[0].id,
  };
};

module.exports = {
  StatusHistoryServiceError,
  isStatusHistoryServiceError,
  getStatusHistory,
  createStatusHistoryRecord,
};
