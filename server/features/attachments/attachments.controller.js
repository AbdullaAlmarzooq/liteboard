// server/features/attachments/attachments.controller.js

const attachmentsService = require("./attachments.service");

const handleAttachmentsError = (res, err, logMessage, fallbackMessage) => {
  if (attachmentsService.isAttachmentsServiceError(err)) {
    return res.status(err.status).json(err.body);
  }

  console.error(logMessage, err);
  return res.status(500).json({ error: fallbackMessage });
};

const resolveTicketIdByAttachmentRequest = async (req) =>
  attachmentsService.resolveTicketIdByAttachmentId(req.params.id);

const getAttachmentBlob = async (req, res) => {
  try {
    const attachmentBlob = await attachmentsService.getAttachmentBlob({
      id: req.params.id,
      user: req.user,
    });
    res.json(attachmentBlob);
  } catch (err) {
    handleAttachmentsError(
      res,
      err,
      "Error fetching attachment blob:",
      "Failed to fetch attachment blob"
    );
  }
};

const getAttachments = async (req, res) => {
  try {
    const attachments = await attachmentsService.getAttachments({
      ticketId: req.params.ticketId,
      user: req.user,
    });
    res.json(attachments);
  } catch (err) {
    handleAttachmentsError(
      res,
      err,
      "Error fetching attachments:",
      "Failed to fetch attachments"
    );
  }
};

const createAttachment = async (req, res) => {
  try {
    const result = await attachmentsService.createAttachment({
      body: req.body,
      user: req.user,
    });
    res.status(201).json(result);
  } catch (err) {
    handleAttachmentsError(
      res,
      err,
      "Error adding attachment:",
      "Failed to add attachment"
    );
  }
};

const deleteAttachment = async (req, res) => {
  try {
    const result = await attachmentsService.deleteAttachment({
      id: req.params.id,
      user: req.user,
    });
    res.json(result);
  } catch (err) {
    handleAttachmentsError(
      res,
      err,
      "Error deleting attachment:",
      "Failed to delete attachment"
    );
  }
};

module.exports = {
  resolveTicketIdByAttachmentRequest,
  getAttachmentBlob,
  getAttachments,
  createAttachment,
  deleteAttachment,
};
