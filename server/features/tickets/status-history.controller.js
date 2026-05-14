// server/features/tickets/status-history.controller.js

const statusHistoryService = require("./status-history.service");

const handleStatusHistoryError = (res, err, logMessage, fallbackMessage) => {
  if (statusHistoryService.isStatusHistoryServiceError(err)) {
    return res.status(err.status).json(err.body);
  }

  console.error(logMessage, err);
  return res.status(500).json({ error: fallbackMessage });
};

const getStatusHistory = async (req, res) => {
  try {
    const history = await statusHistoryService.getStatusHistory({
      ticketId: req.query.ticketId,
      user: req.user,
    });
    res.json(history);
  } catch (err) {
    handleStatusHistoryError(
      res,
      err,
      "Error fetching status history:",
      "Failed to fetch status history"
    );
  }
};

const createStatusHistoryRecord = async (req, res) => {
  try {
    const result = await statusHistoryService.createStatusHistoryRecord({
      body: req.body,
    });
    res.status(201).json(result);
  } catch (err) {
    handleStatusHistoryError(
      res,
      err,
      "Error creating history record:",
      "Failed to create history record"
    );
  }
};

module.exports = {
  getStatusHistory,
  createStatusHistoryRecord,
};
