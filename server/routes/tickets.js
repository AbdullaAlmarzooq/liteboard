// server/routes/tickets.js
const express = require("express");
const db = require("../db/db"); // Your existing SQLite db connection
const router = express.Router();
const crypto = require('crypto'); 

// Helper function to fetch all comments for a ticket
const fetchTicketComments = (ticketId) => {
    // FIXED: Use 'comments' table name and correct schema columns with aliases
    const commentsQuery = `
    SELECT 
      id, ticket_id, text, 
      author AS created_by,              -- Schema: author, Code: created_by
      timestamp AS created_at            -- Schema: timestamp, Code: created_at
    FROM comments 
    WHERE ticket_id = ? 
    ORDER BY timestamp ASC
    `;
    return db.prepare(commentsQuery).all(ticketId);
};

// Helper function to fetch all attachments for a ticket
const fetchTicketAttachments = (ticketId) => {
    // FIXED: Use 'attachments' table name and correct schema columns with aliases
    const attachmentsQuery = `
    SELECT 
      id, ticket_id, 
      filename AS name,         -- Schema: filename, Code: name
      file_type AS type,        -- Schema: file_type, Code: type
      file_size AS size,        -- Schema: file_size, Code: size
      file_data AS data,        -- Schema: file_data, Code: data
      uploaded_at AS created_at -- Schema: uploaded_at, Code: created_at
    FROM attachments 
    WHERE ticket_id = ? 
    ORDER BY uploaded_at ASC
    `;
    return db.prepare(attachmentsQuery).all(ticketId);
};


// GET all tickets (for the LIST VIEW - returns snake_case for due/start dates)
router.get("/", (req, res) => {
  try {
    // Reverted 'due_date' and 'start_date' back to snake_case for list page compatibility
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
    
    // Get tags for all tickets in one query 
    const tagsQuery = `SELECT tt.ticket_id, tg.id as tag_id, tg.label as tag_name, tg.color as tag_color FROM ticket_tags tt JOIN tags tg ON tt.tag_id = tg.id ORDER BY tt.ticket_id, tg.label`;
    const allTags = db.prepare(tagsQuery).all();
    
    // Group tags by ticket_id
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
    
    // Combine tickets with their tags
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

// GET single ticket by ID (for View/Edit Pages - uses camelCase for form initialization)
router.get("/:id", (req, res) => {
  const { id } = req.params;
  
  try {
    // Uses all necessary camelCase aliases for EditTicket form
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
    
    // Get tags for this specific ticket
    const tagsQuery = `SELECT tt.ticket_id, tg.id as tag_id, tg.label as tag_name, tg.color as tag_color FROM ticket_tags tt JOIN tags tg ON tt.tag_id = tg.id WHERE tt.ticket_id = ? ORDER BY tg.label`;
    const tags = db.prepare(tagsQuery).all(id);

    // FETCH COMMENTS AND ATTACHMENTS using the CORRECTED helpers
    const comments = fetchTicketComments(id);
    const attachments = fetchTicketAttachments(id);
    
    // Add additional data to ticket object
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
        comments: comments, 
        attachments: attachments,
    };
    
    res.json(fullTicket);
  } catch (err) {
    console.error("Error fetching ticket:", err);
    res.status(500).json({ error: "Failed to fetch ticket" });
  }
});

// CREATE ticket (No changes needed)
router.post("/", (req, res) => {
  const { id, title, description, status, priority, workflow_id, workgroup_id, module_id, responsible_employee_id, due_date, tag_ids } = req.body;

  try {
    // Start a transaction
    const insertTicket = db.prepare(`INSERT INTO tickets (id, title, description, status, priority, workflow_id, workgroup_id, module_id, responsible_employee_id, due_date, initiate_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`);
    
    const insertTag = db.prepare(`INSERT INTO ticket_tags (ticket_id, tag_id, created_at) VALUES (?, ?, datetime('now'))`);
    
    // Execute in transaction
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


// UPDATE ticket
router.put("/:id", (req, res) => {
  const { id } = req.params;
  
  // Map client camelCase back to database snake_case
  const { 
        title, description, status, priority, workflowId, workgroupId, 
        moduleId, responsibleEmployeeId, dueDate, startDate, tags, 
        comments, attachments
    } = req.body;

    const workflow_id = workflowId;
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

    // Prepare statements for Comments 
    const deleteExistingComments = db.prepare(`DELETE FROM comments WHERE ticket_id = ?`);
    const insertComment = db.prepare(`
INSERT INTO comments 
  (id, ticket_id, text, author, timestamp) 
VALUES (?, ?, ?, ?, ?)
`);

    // Prepare statements for Attachments 
    const deleteExistingAttachments = db.prepare(`DELETE FROM attachments WHERE ticket_id = ?`);
    const insertAttachment = db.prepare(`
INSERT INTO attachments 
  (id, ticket_id, filename, file_type, file_size, file_data, uploaded_at, uploaded_by) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

    
    // Execute in transaction
    const transaction = db.transaction(() => {
      // 1. Update the base ticket
      const result = updateTicket.run(
            title, description, status, priority, 
            workflow_id, workgroup_id, module_id, 
            responsible_employee_id, due_date, start_date, id
        );
      
      if (result.changes === 0) {
        throw new Error("Ticket not found");
      }
      
      // 2. Update tags
      if (tag_ids !== undefined) { 
        deleteExistingTags.run(id);
        
        if (Array.isArray(tag_ids)) {
          tag_ids.forEach(tag_id => {
            insertTag.run(id, tag_id);
          });
        }
      }

      // 3. Update Comments 
      if (comments !== undefined) {
        deleteExistingComments.run(id);
        if (Array.isArray(comments)) {
            comments.forEach(comment => {
                const commentId = comment.id || crypto.randomUUID(); 
                insertComment.run(
                    commentId, id, comment.text, 
                    comment.created_by,       // maps to author
                    comment.created_at || new Date().toISOString() // maps to timestamp
                );
            });
        }
      }

      // 4. Update Attachments 
      if (attachments !== undefined) {
        deleteExistingAttachments.run(id);
        if (Array.isArray(attachments)) {
            const crypto = require('crypto');
            attachments.forEach(attachment => {
                const attachmentId = attachment.id || crypto.randomUUID(); 
                insertAttachment.run(
                    attachmentId, id, 
                    attachment.name,          // maps to filename
                    attachment.type,          // maps to file_type
                    attachment.size,          // maps to file_size
                    attachment.data,          // maps to file_data
                    attachment.created_at || new Date().toISOString(), // maps to uploaded_at
                    attachment.created_by     // maps to uploaded_by (assuming client sends this)
                );
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

// DELETE ticket
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  try {
    // Delete associated records first (Using correct table names)
    const deleteTicketComments = db.prepare("DELETE FROM comments WHERE ticket_id = ?");
    const deleteTicketAttachments = db.prepare("DELETE FROM attachments WHERE ticket_id = ?");

    const deleteTicketTags = db.prepare("DELETE FROM ticket_tags WHERE ticket_id = ?");
    const deleteTicket = db.prepare("DELETE FROM tickets WHERE id = ?");
    
    // Execute in transaction
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