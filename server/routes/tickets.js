// server/routes/tickets.js
const express = require("express");
const db = require("../db/db"); // SQLite connection
const router = express.Router();

// Helper: fetch all comments for a ticket
const fetchTicketComments = (ticketId) => {
  const commentsQuery = `
    SELECT 
      id, ticket_id, text, 
      author AS created_by, 
      timestamp AS created_at
    FROM comments 
    WHERE ticket_id = ? 
    ORDER BY timestamp ASC
  `;
  return db.prepare(commentsQuery).all(ticketId);
};

// Helper: fetch all attachments for a ticket
const fetchTicketAttachments = (ticketId) => {
  const attachmentsQuery = `
    SELECT 
      id, ticket_id, 
      filename AS name,
      file_type AS type,
      file_size AS size,
      file_data AS data,
      uploaded_at AS created_at,
      uploaded_by AS created_by
    FROM attachments 
    WHERE ticket_id = ? 
    ORDER BY uploaded_at ASC
  `;
  return db.prepare(attachmentsQuery).all(ticketId);
};

// ----------------------------------------------------------------------
// GET all tickets (for list view, snake_case dates)
// ----------------------------------------------------------------------
router.get("/", (req, res) => {
  try {
    const ticketsQuery = `
      SELECT 
        t.id, t.title, t.description, t.status, t.priority, 
        t.workflow_id AS workflowId, 
        t.workgroup_id AS workgroupId, w.name AS workgroup_name,
        t.module_id AS moduleId, m.name AS module_name, t.initiate_date AS initiateDate,
        t.responsible_employee_id AS responsibleEmployeeId, e.name AS responsible_name,
        t.due_date, t.start_date 
      FROM tickets t
      LEFT JOIN workgroups w ON t.workgroup_id = w.id
      LEFT JOIN modules m ON t.module_id = m.id
      LEFT JOIN employees e ON t.responsible_employee_id = e.id
      ORDER BY t.id DESC
    `;
    const tickets = db.prepare(ticketsQuery).all();

    // Collect tags in one query
    const tagsQuery = `
      SELECT tt.ticket_id, tg.id as tag_id, tg.label as tag_name, tg.color as tag_color 
      FROM ticket_tags tt 
      JOIN tags tg ON tt.tag_id = tg.id 
      ORDER BY tt.ticket_id, tg.label
    `;
    const allTags = db.prepare(tagsQuery).all();

    const tagsByTicket = {};
    allTags.forEach(tag => {
      if (!tagsByTicket[tag.ticket_id]) {
        tagsByTicket[tag.ticket_id] = [];
      }
      tagsByTicket[tag.ticket_id].push({
        id: tag.tag_id,
        name: tag.tag_name,
        color: tag.tag_color
      });
    });

    const ticketsWithTags = tickets.map(ticket => ({
      ...ticket,
      workGroup: ticket.workgroup_name,
      responsible: ticket.responsible_name,
      module: ticket.module_name,
      tags: tagsByTicket[ticket.id] || []
    }));

    res.json(Array.isArray(ticketsWithTags) ? ticketsWithTags : []);
  } catch (err) {
    console.error("Error fetching tickets:", err);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

// ----------------------------------------------------------------------
// GET single ticket (for view/edit pages, camelCase fields)
// ----------------------------------------------------------------------
router.get("/:id", (req, res) => {
  const { id } = req.params;

  try {
    const ticketQuery = `
      SELECT 
        t.id, t.title, t.description, t.status, t.priority, 
        t.workflow_id AS workflowId, 
        t.workgroup_id AS workgroupId, w.name AS workgroup_name,
        t.module_id AS moduleId, m.name AS module_name, t.initiate_date AS initiateDate,
        t.responsible_employee_id AS responsibleEmployeeId, e.name AS responsible_name,
        t.due_date AS dueDate, t.start_date AS startDate
      FROM tickets t
      LEFT JOIN workgroups w ON t.workgroup_id = w.id
      LEFT JOIN modules m ON t.module_id = m.id
      LEFT JOIN employees e ON t.responsible_employee_id = e.id
      WHERE t.id = ?
    `;
    const ticket = db.prepare(ticketQuery).get(id);

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const tagsQuery = `
      SELECT tt.ticket_id, tg.id as tag_id, tg.label as tag_name, tg.color as tag_color 
      FROM ticket_tags tt 
      JOIN tags tg ON tt.tag_id = tg.id 
      WHERE tt.ticket_id = ? 
      ORDER BY tg.label
    `;
    const tags = db.prepare(tagsQuery).all(id);

    const comments = fetchTicketComments(id);
    const attachments = fetchTicketAttachments(id);

    const fullTicket = {
      ...ticket,
      workGroup: ticket.workgroup_name,
      responsible: ticket.responsible_name,
      module: ticket.module_name,
      tags: tags.map(tag => ({
        id: tag.tag_id,
        name: tag.tag_name,
        color: tag.tag_color
      })),
      comments,
      attachments
    };

    res.json(fullTicket);
  } catch (err) {
    console.error("Error fetching ticket:", err);
    res.status(500).json({ error: "Failed to fetch ticket" });
  }
});

// ----------------------------------------------------------------------
// CREATE ticket
// ----------------------------------------------------------------------
router.post("/", (req, res) => {
  const { id, title, description, status, priority, workflow_id, workgroup_id, module_id, responsible_employee_id, due_date, tag_ids } = req.body;

  try {
    const insertTicket = db.prepare(`
      INSERT INTO tickets 
        (id, title, description, status, priority, workflow_id, workgroup_id, module_id, responsible_employee_id, due_date, initiate_date) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const insertTag = db.prepare(`
      INSERT INTO ticket_tags (ticket_id, tag_id, created_at) 
      VALUES (?, ?, datetime('now'))
    `);

    const transaction = db.transaction(() => {
      insertTicket.run(id, title, description, status, priority, workflow_id, workgroup_id, module_id, responsible_employee_id, due_date);

      if (tag_ids && Array.isArray(tag_ids)) {
        tag_ids.forEach(tag_id => {
          insertTag.run(id, tag_id);
        });
      }
    });

    transaction();
    res.status(201).json({ message: "Ticket created" });
  } catch (err) {
    console.error("Error creating ticket:", err);
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

// ----------------------------------------------------------------------
// UPDATE ticket (fields + tags only)
// ----------------------------------------------------------------------
router.put("/:id", (req, res) => {
  const { id } = req.params;

  const { 
    title, description, status, priority, workflowId, workgroupId, 
    moduleId, responsibleEmployeeId, dueDate, startDate, tags
  } = req.body;

  // --- Status transition validation ---
  if (status) {
    try {
      const currentTicket = db.prepare(
        `SELECT status, workflow_id FROM tickets WHERE id = ?`
      ).get(id);
      if (!currentTicket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      if (status.toUpperCase() !== "CANCELLED") {
        const currentStep = db.prepare(`
          SELECT step_order FROM workflow_steps 
          WHERE workflow_id = ? AND step_code = ?
        `).get(currentTicket.workflow_id, currentTicket.status);

        const newStep = db.prepare(`
          SELECT step_order FROM workflow_steps 
          WHERE workflow_id = ? AND step_code = ?
        `).get(currentTicket.workflow_id, status);

        if (!currentStep || !newStep) {
          return res.status(400).json({ error: "Invalid workflow step" });
        }

        const allowed = [
          currentStep.step_order - 1,
          currentStep.step_order,
          currentStep.step_order + 1
        ];
        if (!allowed.includes(newStep.step_order)) {
          return res.status(400).json({ error: "Invalid status transition" });
        }
      }
    } catch (err) {
      console.error("Error validating status transition:", err);
      return res.status(500).json({ error: "Status validation failed" });
    }
  }

  const workflow_id = workflowId; // kept for clarity
  const workgroup_id = workgroupId;
  const module_id = moduleId;
  const responsible_employee_id = responsibleEmployeeId;
  const due_date = dueDate;
  const start_date = startDate;
  const tag_ids = tags ? tags.map(tag => tag.id) : []; 

  try {
    const updateTicket = db.prepare(`
      UPDATE tickets 
      SET 
        title = ?, description = ?, status = ?, priority = ?, 
        workflow_id = ?, workgroup_id = ?, module_id = ?, 
        responsible_employee_id = ?, due_date = ?, start_date = ?
      WHERE id = ?
    `);

    const deleteExistingTags = db.prepare(`DELETE FROM ticket_tags WHERE ticket_id = ?`);
    const insertTag = db.prepare(`INSERT INTO ticket_tags (ticket_id, tag_id, created_at) VALUES (?, ?, datetime('now'))`);

    const transaction = db.transaction(() => {
      const result = updateTicket.run(
        title, description, status, priority, 
        workflow_id, workgroup_id, module_id, 
        responsible_employee_id, due_date, start_date, id
      );

      if (result.changes === 0) {
        throw new Error("Ticket not found");
      }

      if (tag_ids !== undefined) {
        deleteExistingTags.run(id);
        if (Array.isArray(tag_ids)) {
          tag_ids.forEach(tag_id => {
            insertTag.run(id, tag_id);
          });
        }
      }
    });

    transaction();
    res.json({ message: "Ticket updated successfully" });
  } catch (err) {
    console.error("Error updating ticket:", err);
    if (err.message === "Ticket not found") {
      return res.status(404).json({ error: "Ticket not found" });
    }
    res.status(500).json({ error: "Failed to update ticket" });
  }
});

// ----------------------------------------------------------------------
// DELETE ticket
// ----------------------------------------------------------------------
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  try {
    const deleteTicketComments = db.prepare("DELETE FROM comments WHERE ticket_id = ?");
    const deleteTicketAttachments = db.prepare("DELETE FROM attachments WHERE ticket_id = ?");
    const deleteTicketTags = db.prepare("DELETE FROM ticket_tags WHERE ticket_id = ?");
    const deleteTicket = db.prepare("DELETE FROM tickets WHERE id = ?");

    const transaction = db.transaction(() => {
      deleteTicketComments.run(id);
      deleteTicketAttachments.run(id);
      deleteTicketTags.run(id);

      const result = deleteTicket.run(id);
      if (result.changes === 0) {
        throw new Error("Ticket not found");
      }
    });

    transaction();
    res.json({ message: "Ticket deleted successfully" });
  } catch (err) {
    console.error("Error deleting ticket:", err);
    if (err.message === "Ticket not found") {
      return res.status(404).json({ error: "Ticket not found" });
    }
    res.status(500).json({ error: "Failed to delete ticket" });
  }
});

module.exports = router;
