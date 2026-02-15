const db = require("../db/db");

const TERMINAL_CATEGORY_CODES = new Set([30, 40]);

const isTerminalTicketCategory = (categoryCode) =>
  TERMINAL_CATEGORY_CODES.has(Number(categoryCode));

const resolveTicketLifecycle = async (ticketRef) => {
  const { rows } = await db.query(
    `
      SELECT
        t.id,
        t.ticket_code,
        t.workflow_id,
        t.step_code,
        ws.step_name,
        ws.category_code
      FROM tickets t
      LEFT JOIN workflow_steps ws
        ON ws.workflow_id = t.workflow_id
       AND ws.step_code = t.step_code
      WHERE (t.id::text = $1 OR t.ticket_code = $1)
        AND t.deleted_at IS NULL
      LIMIT 1
    `,
    [ticketRef]
  );

  if (!rows[0]) return null;

  return {
    ...rows[0],
    is_terminal: isTerminalTicketCategory(rows[0].category_code),
  };
};

const ensureTicketIsEditable =
  ({
    paramKey = "id",
    bodyKey = "ticket_id",
    queryKey = "ticketId",
    resolveTicketRef = null,
  } = {}) =>
  async (req, res, next) => {
    try {
      const ticketRef = resolveTicketRef
        ? await resolveTicketRef(req)
        : req.params?.[paramKey] ?? req.body?.[bodyKey] ?? req.query?.[queryKey];

      if (!ticketRef) {
        return res.status(400).json({
          error: `Ticket reference is required (${paramKey} param, ${bodyKey} body, or ${queryKey} query).`,
        });
      }

      const ticket = await resolveTicketLifecycle(ticketRef);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      if (ticket.is_terminal) {
        return res.status(409).json({
          error: "Ticket is closed/cancelled and cannot be modified.",
          ticket_id: ticket.id,
          ticket_code: ticket.ticket_code,
          step_code: ticket.step_code,
          category_code: ticket.category_code,
        });
      }

      req.ticketLifecycle = ticket;
      next();
    } catch (error) {
      console.error("Failed to evaluate ticket lifecycle:", error);
      res.status(500).json({ error: "Failed to validate ticket editability" });
    }
  };

module.exports = {
  TERMINAL_CATEGORY_CODES,
  isTerminalTicketCategory,
  resolveTicketLifecycle,
  ensureTicketIsEditable,
};
