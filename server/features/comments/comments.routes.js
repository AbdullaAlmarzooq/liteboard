// server/features/comments/comments.routes.js

const express = require("express");
const authenticateToken = require("../../middleware/authMiddleware");
const { ensureTicketIsEditable } = require("../../middleware/ensureTicketIsEditable");
const commentsController = require("./comments.controller");

const router = express.Router();

// GET comments for a ticket
router.get("/", authenticateToken(), commentsController.getComments);

// POST new comment
router.post(
  "/",
  authenticateToken(),
  ensureTicketIsEditable({ bodyKey: "ticket_id" }),
  commentsController.createComment
);

// PUT update comment
router.put(
  "/:id",
  authenticateToken(),
  ensureTicketIsEditable({
    resolveTicketRef: commentsController.resolveTicketIdByCommentRequest,
  }),
  commentsController.ensureCommentOwner,
  commentsController.updateComment
);

// DELETE comment
router.delete(
  "/:id",
  authenticateToken(),
  ensureTicketIsEditable({
    resolveTicketRef: commentsController.resolveTicketIdByCommentRequest,
  }),
  commentsController.ensureCommentOwner,
  commentsController.deleteComment
);

module.exports = router;
