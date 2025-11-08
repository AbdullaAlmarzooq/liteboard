//server/routes/profile/stats.js

const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/authMiddleware");
const sqlite3 = require("sqlite3").verbose();

// Connect to the database
const db = new sqlite3.Database("./liteboard.db");

// 🔹 GET /api/profile/stats
router.get("/stats", authenticateToken(), (req, res) => {
  const userId = req.user.id; // e.g., "EMP-007"

  const sqlQueries = {
    raisedByMe: `SELECT COUNT(*) AS count FROM tickets WHERE created_by = ?`,
    assignedToMe: `SELECT COUNT(*) AS count FROM tickets WHERE responsible_employee_id = ?`,
    workgroupTickets: `
      SELECT COUNT(*) AS count
      FROM tickets
      WHERE workgroup_id = (
        SELECT workgroup_code FROM employees WHERE id = ?
      )
    `,
  };

  const results = {};

  db.get(sqlQueries.raisedByMe, [userId], (err, row1) => {
    if (err) return res.status(500).json({ error: "Error fetching raised tickets" });
    results.raised_by_me = row1.count;

    db.get(sqlQueries.assignedToMe, [userId], (err, row2) => {
      if (err) return res.status(500).json({ error: "Error fetching assigned tickets" });
      results.assigned_to_me = row2.count;

      db.get(sqlQueries.workgroupTickets, [userId], (err, row3) => {
        if (err) return res.status(500).json({ error: "Error fetching workgroup tickets" });
        results.workgroup_tickets = row3.count;

        // ✅ Final response
        res.json(results);
      });
    });
  });
});

module.exports = router;