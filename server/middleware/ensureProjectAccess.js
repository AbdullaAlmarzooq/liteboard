const { getReadableTicketAccess } = require("../utils/projectAccess");

module.exports = async function ensureProjectAccess(req, res, next) {
  try {
    const access = await getReadableTicketAccess(req.user, req.params.id);

    if (!access.ticketId) {
      return res.status(access.status).json({
        error: access.message,
      });
    }

    next();
  } catch (err) {
    console.error("ensureProjectAccess error:", err);
    res.status(500).json({ error: "Internal server error during project access check" });
  }
};
