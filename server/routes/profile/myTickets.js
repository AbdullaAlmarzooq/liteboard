const express = require("express");
const router = express.Router();
const db = require("../../db/db");
const authenticateToken = require("../../middleware/authMiddleware");

// 🔹 GET /api/profile/my-tickets
router.get("/my-tickets", authenticateToken(), (req, res) => {
  const userId = req.user.id; // Example: "EMP-007"

  try {
    // Get the user's workgroup ID first
    const employee = db.prepare(`SELECT workgroup_code FROM employees WHERE id = ?`).get(userId);

    if (!employee || !employee.workgroup_code) {
      return res.status(404).json({ error: "User workgroup not found." });
    }

    const workgroupId = employee.workgroup_code;

    // Fetch tickets in the same workgroup that are not closed nor cancelled
    
    const query = `
    SELECT 
      t.id,
      t.title,
      t.status,
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
    LEFT JOIN workflow_steps ws ON t.step_code = ws.step_code
    WHERE 
        t.workgroup_id = ?
        AND ws.category_code NOT IN (3, 30)
    ORDER BY t.updated_at DESC
    LIMIT 20
  `;

    const tickets = db.prepare(query).all(workgroupId);
    res.json(tickets);
  } catch (err) {
    console.error("Error fetching my workgroup tickets:", err);
    res.status(500).json({ error: "Failed to load tickets for your workgroup" });
  }
});

module.exports = router;
