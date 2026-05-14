// server/features/audit-logs/audit-logs.routes.js

const express = require("express");
const authenticateToken = require("../../middleware/authMiddleware");
const auditLogsController = require("./audit-logs.controller");

const router = express.Router();

router.get("/filters", authenticateToken([1]), auditLogsController.getAuditLogFilters);
router.get("/", authenticateToken([1]), auditLogsController.getAuditLogs);

module.exports = router;
