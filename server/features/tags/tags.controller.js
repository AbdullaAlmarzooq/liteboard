// server/features/tags/tags.controller.js

const tagsService = require("./tags.service");

const handleTagsError = (res, err, logMessage, fallbackMessage) => {
  if (tagsService.isTagsServiceError(err)) {
    return res.status(err.status).json(err.body);
  }

  console.error(logMessage, err);
  return res.status(500).json({ error: fallbackMessage });
};

const getTags = async (req, res) => {
  try {
    const tags = await tagsService.getTags({
      query: req.query,
      user: req.user,
    });
    res.json(tags);
  } catch (err) {
    handleTagsError(res, err, "Error fetching tags:", "Failed to fetch tags");
  }
};

const createTag = async (req, res) => {
  try {
    const result = await tagsService.createTag({
      body: req.body,
      user: req.user,
    });
    res.status(201).json(result);
  } catch (err) {
    handleTagsError(res, err, "Error creating tag:", "Failed to create tag");
  }
};

const updateTag = async (req, res) => {
  try {
    const result = await tagsService.updateTag({
      id: req.params.id,
      body: req.body,
      user: req.user,
    });
    res.json(result);
  } catch (err) {
    handleTagsError(res, err, "Error updating tag:", "Failed to update tag");
  }
};

const deleteTag = async (req, res) => {
  try {
    const result = await tagsService.deleteTag({
      id: req.params.id,
      user: req.user,
    });
    res.json(result);
  } catch (err) {
    handleTagsError(res, err, "Error deleting tag:", "Failed to delete tag");
  }
};

const getTicketTags = async (req, res) => {
  try {
    const tags = await tagsService.getTicketTags({
      ticketId: req.params.ticketId,
      user: req.user,
    });
    res.json(tags);
  } catch (err) {
    handleTagsError(res, err, "Error fetching tags for ticket:", "Failed to fetch ticket tags");
  }
};

const addTagToTicket = async (req, res) => {
  try {
    const result = await tagsService.addTagToTicket({
      body: req.body,
      user: req.user,
    });
    res.status(201).json(result);
  } catch (err) {
    handleTagsError(res, err, "Error associating tag:", "Failed to associate tag with ticket");
  }
};

const removeTagFromTicket = async (req, res) => {
  try {
    const result = await tagsService.removeTagFromTicket({
      ticketId: req.params.ticketId,
      tagId: req.params.tagId,
      user: req.user,
    });
    res.json(result);
  } catch (err) {
    handleTagsError(res, err, "Error removing tag:", "Failed to remove tag from ticket");
  }
};

const replaceTicketTags = async (req, res) => {
  try {
    const result = await tagsService.replaceTicketTags({
      ticketId: req.params.ticketId,
      body: req.body,
      user: req.user,
    });
    res.json(result);
  } catch (err) {
    handleTagsError(res, err, "Error updating all tags:", "Failed to update tags for ticket");
  }
};

module.exports = {
  getTags,
  createTag,
  updateTag,
  deleteTag,
  getTicketTags,
  addTagToTicket,
  removeTagFromTicket,
  replaceTicketTags,
};
