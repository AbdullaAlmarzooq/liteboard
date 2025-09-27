// server/routes/tickets.js
const express = require("express");
const db = require("../db/db"); // Your existing SQLite db connection
const router = express.Router();

// GET all tickets
router.get("/", (req, res) => {
  try {
    // First, get all tickets with their basic information
    const ticketsQuery = `
      SELECT t.id, t.title, t.description, t.status, t.priority, 
             t.workflow_id, t.workgroup_id, w.name AS workgroup_name,
             t.module_id, m.name AS module_name, t.initiate_date AS initiateDate,
             t.responsible_employee_id, e.name AS responsible_name,
             t.due_date
      FROM tickets t
      LEFT JOIN workgroups w ON t.workgroup_id = w.id
      LEFT JOIN modules m ON t.module_id = m.id
      LEFT JOIN employees e ON t.responsible_employee_id = e.id
      ORDER BY t.id DESC
    `;
    const tickets = db.prepare(ticketsQuery).all();
    
    // Get tags for all tickets in one query
    const tagsQuery = `
      SELECT tt.ticket_id, tg.id as tag_id, tg.label as tag_name
      FROM ticket_tags tt
      JOIN tags tg ON tt.tag_id = tg.id
      ORDER BY tt.ticket_id, tg.label
    `;
    const allTags = db.prepare(tagsQuery).all();
    
    // Group tags by ticket_id
    const tagsByTicket = {};
    allTags.forEach(tag => {
      if (!tagsByTicket[tag.ticket_id]) {
        tagsByTicket[tag.ticket_id] = [];
      }
      tagsByTicket[tag.ticket_id].push({
        id: tag.tag_id,
        name: tag.tag_name
      });
    });
    
    // Combine tickets with their tags
    const ticketsWithTags = tickets.map(ticket => ({
      ...ticket,
      tags: tagsByTicket[ticket.id] || []
    }));
    
    res.json(Array.isArray(ticketsWithTags) ? ticketsWithTags : []);
  } catch (err) {
    console.error("Error fetching tickets:", err);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

// GET single ticket by ID
router.get("/:id", (req, res) => {
  const { id } = req.params;
  
  try {
    const ticketQuery = `
      SELECT t.id, t.title, t.description, t.status, t.priority, 
             t.workflow_id, t.workgroup_id, w.name AS workgroup_name,
             t.module_id, m.name AS module_name, t.initiate_date AS initiateDate,
             t.responsible_employee_id, e.name AS responsible_name,
             t.due_date
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
    const tagsQuery = `
      SELECT tt.ticket_id, tg.id as tag_id, tg.label as tag_name
      FROM ticket_tags tt
      JOIN tags tg ON tt.tag_id = tg.id
      WHERE tt.ticket_id = ?
      ORDER BY tg.label
    `;
    const tags = db.prepare(tagsQuery).all(id);
    
    // Add tags to ticket
    ticket.tags = tags.map(tag => ({
      id: tag.tag_id,
      name: tag.tag_name
    }));
    
    res.json(ticket);
  } catch (err) {
    console.error("Error fetching ticket:", err);
    res.status(500).json({ error: "Failed to fetch ticket" });
  }
});

// CREATE ticket
router.post("/", (req, res) => {
  const { id, title, description, status, priority, workflow_id, workgroup_id, module_id, responsible_employee_id, due_date, tag_ids } = req.body;

  try {
    // Start a transaction
    const insertTicket = db.prepare(`
      INSERT INTO tickets (id, title, description, status, priority, workflow_id, workgroup_id, module_id, responsible_employee_id, due_date, initiate_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    
    const insertTag = db.prepare(`
      INSERT INTO ticket_tags (ticket_id, tag_id, created_at)
      VALUES (?, ?, datetime('now'))
    `);
    
    // Execute in transaction
    const transaction = db.transaction(() => {
      // Insert the ticket
      insertTicket.run(id, title, description, status, priority, workflow_id, workgroup_id, module_id, responsible_employee_id, due_date);
      
      // Insert tags if provided
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
  const { title, description, status, priority, workflow_id, workgroup_id, module_id, responsible_employee_id, due_date, tag_ids } = req.body;

  try {
    const updateTicket = db.prepare(`
      UPDATE tickets 
      SET title = ?, description = ?, status = ?, priority = ?, 
          workflow_id = ?, workgroup_id = ?, module_id = ?, 
          responsible_employee_id = ?, due_date = ?
      WHERE id = ?
    `);
    
    const deleteExistingTags = db.prepare(`
      DELETE FROM ticket_tags WHERE ticket_id = ?
    `);
    
    const insertTag = db.prepare(`
      INSERT INTO ticket_tags (ticket_id, tag_id, created_at)
      VALUES (?, ?, datetime('now'))
    `);
    
    // Execute in transaction
    const transaction = db.transaction(() => {
      // Update the ticket
      const result = updateTicket.run(title, description, status, priority, workflow_id, workgroup_id, module_id, responsible_employee_id, due_date, id);
      
      if (result.changes === 0) {
        throw new Error("Ticket not found");
      }
      
      // Update tags - delete existing and insert new ones
      if (tag_ids !== undefined) { // Only update tags if tag_ids is provided
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

// DELETE ticket
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  try {
    const deleteTicketTags = db.prepare("DELETE FROM ticket_tags WHERE ticket_id = ?");
    const deleteTicket = db.prepare("DELETE FROM tickets WHERE id = ?");
    
    // Execute in transaction to maintain referential integrity
    const transaction = db.transaction(() => {
      // First delete associated tags
      deleteTicketTags.run(id);
      
      // Then delete the ticket
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