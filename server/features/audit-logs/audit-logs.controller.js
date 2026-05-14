// server/features/audit-logs/audit-logs.controller.js

const auditLogsService = require("./audit-logs.service");

const getAuditLogFilters = async (req, res) => {
  try {
    const filters = await auditLogsService.getAuditLogFilters();
    res.json(filters);
  } catch (err) {
    console.error("Error loading audit log filters:", err);
    res.status(500).json({ error: "Failed to load audit log filters" });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const result = await auditLogsService.getAuditLogs({ query: req.query });
    res.json(result);
  } catch (err) {
    console.error("Error fetching audit logs:", err);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
};

module.exports = {
  getAuditLogFilters,
  getAuditLogs,
};
