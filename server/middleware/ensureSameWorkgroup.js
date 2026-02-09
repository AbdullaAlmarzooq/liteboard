// server/middleware/ensureSameWorkgroup.js
const db = require("../db/db");

module.exports = async function ensureSameWorkgroup(req, res, next) {
  try {
    const user = req.user; // set by authenticateToken()
    const ticketId = req.params.id;

    if (!user || !user.id) {
      return res.status(401).json({ error: "Unauthorized: user not found in token" });
    }

    // Allow Admins (role_id = 1)
    if (user.role_id === 1) {
      return next();
    }

    // Get user's workgroup
    const employeeResult = await db.query(
      "SELECT workgroup_id FROM employees WHERE id = $1",
      [user.id]
    );
    const employee = employeeResult.rows[0];

    if (!employee) {
      return res.status(404).json({ error: "Employee record not found" });
    }

    // Get ticket's workgroup
    const ticketResult = await db.query(
      "SELECT workgroup_id FROM tickets WHERE (id::text = $1 OR ticket_code = $1) AND deleted_at IS NULL",
      [ticketId]
    );
    const ticket = ticketResult.rows[0];

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    // Compare
    if (employee.workgroup_id !== ticket.workgroup_id) {
      return res.status(403).json({
        error: "You are not part of this workgroup. You cannot edit this ticket.",
      });
    }

    next();
  } catch (err) {
    console.error("ensureSameWorkgroup error:", err);
    res.status(500).json({ error: "Internal server error during workgroup check" });
  }
};
