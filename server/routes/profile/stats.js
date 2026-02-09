// server/routes/profile/stats.js
const express = require("express");
const router = express.Router();
const authenticateToken = require("../../middleware/authMiddleware");
const db = require("../../db/db");

// 🔹 GET /api/profile/stats
router.get("/stats", authenticateToken(), async (req, res) => {
  const userId = req.user.id; // e.g., "EMP-007"

  try {
    const raisedByMeResult = await db.query(
      "SELECT COUNT(*) AS count FROM tickets WHERE created_by = $1 AND deleted_at IS NULL",
      [userId]
    );
    const assignedToMeResult = await db.query(
      `
        SELECT COUNT(*) AS count
        FROM tickets t
        JOIN workflow_steps ws
          ON ws.workflow_id = t.workflow_id AND ws.step_code = t.step_code
        WHERE t.responsible_employee_id = $1
        AND t.deleted_at IS NULL
        AND ws.category_code != 90
      `,
      [userId]
    );
    const workgroupTicketsResult = await db.query(
      `
        SELECT COUNT(*) AS count
        FROM tickets t
        JOIN workflow_steps ws
          ON ws.workflow_id = t.workflow_id AND ws.step_code = t.step_code
        WHERE t.workgroup_id = (
          SELECT workgroup_id FROM employees WHERE id = $1
        )
        AND t.deleted_at IS NULL
        AND ws.category_code != 90
      `,
      [userId]
    );

    // ✅ Send results
    res.json({
      raised_by_me: raisedByMeResult.rows[0]?.count || 0,
      assigned_to_me: assignedToMeResult.rows[0]?.count || 0,
      workgroup_tickets: workgroupTicketsResult.rows[0]?.count || 0,
    });
  } catch (err) {
    console.error("Error fetching profile stats:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

module.exports = router;
