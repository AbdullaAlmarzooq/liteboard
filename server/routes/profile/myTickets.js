const express = require("express");
const router = express.Router();
const db = require("../../db/db");
const authenticateToken = require("../../middleware/authMiddleware");

// 🔹 GET /api/profile/my-tickets
router.get("/my-tickets", authenticateToken(), async (req, res) => {
  const userId = req.user.id; // Example: "EMP-007"

  try {
    // Get the user's workgroup ID first
    const employeeResult = await db.query(
      `SELECT workgroup_id FROM employees WHERE id = $1`,
      [userId]
    );
    const employee = employeeResult.rows[0];

    if (!employee || !employee.workgroup_id) {
      return res.status(404).json({ error: "User workgroup not found." });
    }

    const workgroupId = employee.workgroup_id;

    // Fetch tickets in the same workgroup that are not closed nor cancelled
    
    const query = `
    SELECT 
      t.id,
      t.ticket_code,
      t.ticket_code AS ticketCode,
      t.title,
      COALESCE(ws.step_name, t.step_code) AS status,
      t.step_code,
      COALESCE(ws.step_name, t.step_code) AS current_step_name,
      t.priority,
      t.created_by,
      e.name AS created_by_name,
      t.responsible_employee_id,
      r.name AS responsible_name,
      t.workgroup_id,
      w.name AS workgroup_name,
      t.module_id,
      m.name AS module_name,
      t.due_date,
      t.start_date,
      t.updated_at,
      ws.category_code
    FROM tickets t
    LEFT JOIN employees e ON t.created_by = e.id
    LEFT JOIN employees r ON t.responsible_employee_id = r.id
    LEFT JOIN workgroups w ON t.workgroup_id = w.id
    LEFT JOIN modules m ON t.module_id = m.id
    LEFT JOIN workflow_steps ws 
      ON t.workflow_id = ws.workflow_id AND t.step_code = ws.step_code
    WHERE 
        t.workgroup_id = $1
        AND t.deleted_at IS NULL
        AND ws.category_code NOT IN (90)
    ORDER BY t.updated_at DESC
    LIMIT 20
  `;

    const { rows: tickets } = await db.query(query, [workgroupId]);
    res.json(tickets);
  } catch (err) {
    console.error("Error fetching my workgroup tickets:", err);
    res.status(500).json({ error: "Failed to load tickets for your workgroup" });
  }
});

module.exports = router;
