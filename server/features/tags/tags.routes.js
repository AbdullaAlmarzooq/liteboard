// server/features/tags/tags.routes.js

const express = require("express");
const authenticateToken = require("../../middleware/authMiddleware");
const { ensureTicketIsEditable } = require("../../middleware/ensureTicketIsEditable");
const tagsController = require("./tags.controller");

const tagsRouter = express.Router();
const ticketTagsRouter = express.Router();

// GET all tags
tagsRouter.get("/", authenticateToken(), tagsController.getTags);

// POST create new tag
tagsRouter.post("/", authenticateToken([1]), tagsController.createTag);

// PUT update existing tag by ID
tagsRouter.put("/:id", authenticateToken([1]), tagsController.updateTag);

// DELETE tag by ID
tagsRouter.delete("/:id", authenticateToken([1]), tagsController.deleteTag);

// GET all tags for a specific ticket
ticketTagsRouter.get("/:ticketId", authenticateToken(), tagsController.getTicketTags);

// POST associate a tag with a ticket
ticketTagsRouter.post(
  "/",
  authenticateToken(),
  ensureTicketIsEditable({ bodyKey: "ticket_id" }),
  tagsController.addTagToTicket
);

// DELETE remove a tag from a ticket
ticketTagsRouter.delete(
  "/:ticketId/:tagId",
  authenticateToken(),
  ensureTicketIsEditable({ paramKey: "ticketId" }),
  tagsController.removeTagFromTicket
);

// PUT replace all tags for a ticket
ticketTagsRouter.put(
  "/:ticketId",
  authenticateToken(),
  ensureTicketIsEditable({ paramKey: "ticketId" }),
  tagsController.replaceTicketTags
);

module.exports = {
  tagsRouter,
  ticketTagsRouter,
};
