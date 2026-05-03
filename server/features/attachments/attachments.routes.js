// server/features/attachments/attachments.routes.js

const express = require("express");
const authenticateToken = require("../../middleware/authMiddleware");
const { ensureTicketIsEditable } = require("../../middleware/ensureTicketIsEditable");
const attachmentsController = require("./attachments.controller");

const router = express.Router();

// GET attachment blob
router.get("/:id/blob", authenticateToken(), attachmentsController.getAttachmentBlob);

// GET all attachment metadata for a ticket
router.get("/:ticketId", authenticateToken(), attachmentsController.getAttachments);

// POST a new attachment
router.post(
  "/",
  authenticateToken(),
  ensureTicketIsEditable({ bodyKey: "ticket_id" }),
  attachmentsController.createAttachment
);

// DELETE an attachment
router.delete(
  "/:id",
  authenticateToken(),
  ensureTicketIsEditable({
    resolveTicketRef: attachmentsController.resolveTicketIdByAttachmentRequest,
  }),
  attachmentsController.deleteAttachment
);

module.exports = router;
