// server/routes/tickets.js
const express = require("express");
const db = require("../db/db");
const router = express.Router();

// GET all tickets
router.get("/", (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT t.id, t.title, t.description, t.status, t.priority, 
             t.workflow_id, t.workgroup_id, w.name AS workgroup_name
      FROM tickets t
      LEFT JOIN workgroups w ON t.workgroup_id = w.id
    `).all();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

// CREATE ticket
router.post("/", (req, res) => {
  const { id, title, description, status, priority, workflow_id, workgroup_id } = req.body;
  try {
    const stmt = db.prepare(`
      INSERT INTO tickets (id, title, description, status, priority, workflow_id, workgroup_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, title, description, status, priority, workflow_id, workgroup_id);
    res.status(201).json({ message: "Ticket created" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

module.exports = router;
