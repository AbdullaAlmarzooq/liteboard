// server/routes/profile/stats.js
const express = require("express");
const router = express.Router();
const authenticateToken = require("../../middleware/authMiddleware");
const db = require("../../db/db"); // already better-sqlite3 instance

// 🔹 GET /api/profile/stats
router.get("/stats", authenticateToken(), (req, res) => {
  const userId = req.user.id; // e.g., "EMP-007"

  try {
    // Prepare queries
    const raisedByMeStmt = db.prepare(
      "SELECT COUNT(*) AS count FROM tickets WHERE created_by = ?"
    );
    const assignedToMeStmt = db.prepare(
      "SELECT COUNT(*) AS count FROM tickets WHERE responsible_employee_id = ?"
    );
    const workgroupTicketsStmt = db.prepare(`
      SELECT COUNT(*) AS count
      FROM tickets
      WHERE workgroup_id = (
        SELECT workgroup_code FROM employees WHERE id = ?
      )
    `);

    // Execute queries synchronously
    const raisedByMe = raisedByMeStmt.get(userId);
    const assignedToMe = assignedToMeStmt.get(userId);
    const workgroupTickets = workgroupTicketsStmt.get(userId);

    // ✅ Send results
    res.json({
      raised_by_me: raisedByMe?.count || 0,
      assigned_to_me: assignedToMe?.count || 0,
      workgroup_tickets: workgroupTickets?.count || 0,
    });
  } catch (err) {
    console.error("Error fetching profile stats:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

module.exports = router;
