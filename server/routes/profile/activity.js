const express = require("express");
const router = express.Router();
const db = require("../../db/db");
const authenticateToken = require("../../middleware/authMiddleware");

// 🔹 GET /api/profile/activity
router.get("/activity", authenticateToken(), (req, res) => {
  const userId = req.user.id; // e.g., "EMP-005"

  try {
    const sql = `
      SELECT 
        sh.id,
        sh.ticket_id,
        t.title AS ticket_title,
        sh.activity_type,
        sh.field_name,
        sh.new_value,
        sh.timestamp,
        e.name AS changed_by_name,
        sh.changed_by
      FROM status_history sh
      LEFT JOIN tickets t ON sh.ticket_id = t.id
      LEFT JOIN employees e ON sh.changed_by = e.id
      WHERE sh.changed_by = ?
      ORDER BY sh.timestamp DESC
      LIMIT 50
    `;

    const rows = db.prepare(sql).all(userId);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching user activity:", err);
    res.status(500).json({ error: "Failed to fetch recent activity" });
  }
});

module.exports = router;
