const db = require("../db/db"); // adjust path if needed

// Middleware: allow edit only if user is in the same workgroup OR admin (role_id = 1)
function ensureSameWorkgroup(req, res, next) {
  try {
    const user = req.user;
    const ticketId = req.params.id;

    if (!user || !user.id) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!ticketId) {
      return res.status(400).json({ error: "Ticket ID is required" });
    }

    // Admins bypass restriction
    if (user.role_id === 1) {
      return next();
    }

    // Get ticket’s workgroup
    const ticket = db
      .prepare("SELECT workgroup_id FROM tickets WHERE id = ?")
      .get(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    // Get employee’s workgroup
    const employee = db
      .prepare("SELECT workgroup_code FROM employees WHERE id = ?")
      .get(user.id);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Compare
    if (ticket.workgroup_id !== employee.workgroup_code) {
      return res.status(403).json({
        error: "Access denied: You do not belong to this ticket's workgroup.",
      });
    }

    // All good
    next();
  } catch (err) {
    console.error("ensureSameWorkgroup error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = ensureSameWorkgroup;
