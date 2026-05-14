// server/features/tickets/status-history.routes.js

const express = require("express");
const authenticateToken = require("../../middleware/authMiddleware");
const { ensureTicketIsEditable } = require("../../middleware/ensureTicketIsEditable");
const statusHistoryController = require("./status-history.controller");

const router = express.Router();

// GET history for a ticket
router.get("/", authenticateToken(), statusHistoryController.getStatusHistory);

// POST new history record
router.post(
  "/",
  ensureTicketIsEditable({ bodyKey: "ticket_id" }),
  statusHistoryController.createStatusHistoryRecord
);

module.exports = router;
