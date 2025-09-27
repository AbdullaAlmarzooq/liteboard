// server/routes/tickets.js
const express = require("express");
const db = require("../db/db"); // Your existing SQLite db connection
const router = express.Router();

// GET all tickets
router.get("/", (req, res) => {
  try {
    // Use LEFT JOINs to include workgroup/module names if they exist
    const query = `
      SELECT t.id, t.title, t.description, t.status, t.priority, 
             t.workflow_id, t.workgroup_id, w.name AS workgroup_name,
             t.module_id, m.name AS module_name, t.initiate_date AS initiateDate
      FROM tickets t
      LEFT JOIN workgroups w ON t.workgroup_id = w.id
      LEFT JOIN modules m ON t.module_id = m.id
    `;
    const rows = db.prepare(query).all();
    
    // Ensure we always return an array
    res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error("Error fetching tickets:", err);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

// CREATE ticket
router.post("/", (req, res) => {
  const { id, title, description, status, priority, workflow_id, workgroup_id, module_id } = req.body;

  try {
    const stmt = db.prepare(`
      INSERT INTO tickets (id, title, description, status, priority, workflow_id, workgroup_id, module_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, title, description, status, priority, workflow_id, workgroup_id, module_id);

    res.status(201).json({ message: "Ticket created" });
  } catch (err) {
    console.error("Error creating ticket:", err);
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

module.exports = router;