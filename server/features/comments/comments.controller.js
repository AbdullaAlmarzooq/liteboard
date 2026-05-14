// server/features/comments/comments.controller.js

const commentsService = require("./comments.service");

const handleCommentsError = (res, err, logMessage, fallbackMessage) => {
  if (commentsService.isCommentsServiceError(err)) {
    return res.status(err.status).json(err.body);
  }

  console.error(logMessage, err);
  return res.status(500).json({ error: fallbackMessage });
};

const resolveTicketIdByCommentRequest = async (req) =>
  commentsService.resolveTicketIdByCommentId(req.params.id);

const ensureCommentOwner = async (req, res, next) => {
  try {
    const comment = await commentsService.getCommentForOwnership(req.params.id);

    if (String(comment.author_id) !== String(req.user?.id)) {
      return res.status(403).json({ error: "You can only modify your own comments." });
    }

    req.commentRecord = comment;
    next();
  } catch (err) {
    handleCommentsError(
      res,
      err,
      "Error validating comment ownership:",
      "Failed to validate comment ownership"
    );
  }
};

const getComments = async (req, res) => {
  try {
    const comments = await commentsService.getComments({
      ticketId: req.query.ticketId,
      user: req.user,
    });
    res.json(comments);
  } catch (err) {
    handleCommentsError(res, err, "Error fetching comments:", "Failed to fetch comments");
  }
};

const createComment = async (req, res) => {
  try {
    const result = await commentsService.createComment({
      body: req.body,
      user: req.user,
    });
    res.status(201).json(result);
  } catch (err) {
    handleCommentsError(res, err, "Error creating comment:", "Failed to create comment");
  }
};

const updateComment = async (req, res) => {
  try {
    const result = await commentsService.updateComment({
      id: req.params.id,
      text: req.body.text,
      user: req.user,
      commentRecord: req.commentRecord,
    });
    res.json(result);
  } catch (err) {
    handleCommentsError(res, err, "Error updating comment:", "Failed to update comment");
  }
};

const deleteComment = async (req, res) => {
  try {
    const result = await commentsService.deleteComment({ id: req.params.id });
    res.json(result);
  } catch (err) {
    handleCommentsError(res, err, "Error deleting comment:", "Failed to delete comment");
  }
};

module.exports = {
  resolveTicketIdByCommentRequest,
  ensureCommentOwner,
  getComments,
  createComment,
  updateComment,
  deleteComment,
};
