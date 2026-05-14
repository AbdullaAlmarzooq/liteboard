// server/features/tickets/tickets.controller.js

const ticketsService = require("./tickets.service");

const handleTicketsError = (res, err, logMessage, fallbackMessage) => {
  if (ticketsService.isTicketsServiceError(err)) {
    return res.status(err.status).json(err.body);
  }

  console.error(logMessage, err);
  return res.status(500).json({ error: fallbackMessage });
};

const getAllowedSteps = async (req, res) => {
  try {
    const allowedSteps = await ticketsService.getAllowedSteps({ id: req.params.id });
    res.json(allowedSteps);
  } catch (err) {
    handleTicketsError(res, err, "Failed to fetch allowed steps:", "Failed to fetch allowed steps");
  }
};

const transitionTicket = async (req, res) => {
  try {
    const result = await ticketsService.transitionTicket({
      id: req.params.id,
      stepCode: req.body.step_code,
      user: req.user,
    });
    res.json(result);
  } catch (err) {
    handleTicketsError(res, err, "Failed to transition ticket:", "Failed to transition ticket");
  }
};

const getFilterOptions = async (req, res) => {
  try {
    const filterOptions = await ticketsService.getFilterOptions({
      query: req.query,
      user: req.user,
    });
    res.json(filterOptions);
  } catch (err) {
    handleTicketsError(res, err, "Error loading ticket filter options:", "Failed to load ticket filter options");
  }
};

const getTicketsList = async (req, res) => {
  try {
    const result = await ticketsService.getTicketsList({
      query: req.query,
      user: req.user,
    });
    res.json(result);
  } catch (err) {
    handleTicketsError(res, err, "Error fetching lightweight tickets list:", "Failed to fetch lightweight tickets list");
  }
};

const searchTickets = async (req, res) => {
  try {
    const result = await ticketsService.searchTickets({
      query: req.query,
      user: req.user,
    });
    res.json(result);
  } catch (err) {
    handleTicketsError(res, err, "Error searching tickets:", "Failed to search tickets");
  }
};

const exportTickets = async (req, res) => {
  try {
    const result = await ticketsService.exportTickets({
      query: req.query,
      user: req.user,
    });
    res.json(result);
  } catch (err) {
    handleTicketsError(res, err, "Error loading ticket export data:", "Failed to load ticket export data");
  }
};

const getAllTickets = async (req, res) => {
  try {
    const tickets = await ticketsService.getAllTickets({ user: req.user });
    res.json(tickets);
  } catch (err) {
    handleTicketsError(res, err, "Error fetching tickets:", "Failed to fetch tickets");
  }
};

const getTicketEvents = async (req, res) => {
  try {
    const events = await ticketsService.getTicketEvents({ id: req.params.id });
    res.json(events);
  } catch (err) {
    handleTicketsError(res, err, "Error fetching ticket events:", "Failed to fetch ticket events");
  }
};

const getTicketDetail = async (req, res) => {
  try {
    const ticket = await ticketsService.getTicketDetail({
      id: req.params.id,
      includeBlobs: req.query.include_blobs !== "false",
      user: req.user,
    });
    res.json(ticket);
  } catch (err) {
    handleTicketsError(res, err, "Error fetching ticket:", "Failed to fetch ticket");
  }
};

const createTicket = async (req, res) => {
  try {
    const result = await ticketsService.createTicket({
      body: req.body,
      user: req.user,
    });
    res.status(201).json(result);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Ticket code already exists" });
    }

    handleTicketsError(res, err, "Error creating ticket:", "Failed to create ticket");
  }
};

const updateTicket = async (req, res) => {
  try {
    const result = await ticketsService.updateTicket({
      id: req.params.id,
      body: req.body,
      user: req.user,
    });
    res.json(result);
  } catch (err) {
    handleTicketsError(res, err, "Error updating ticket:", "Failed to update ticket");
  }
};

const deleteTicket = async (req, res) => {
  try {
    const result = await ticketsService.deleteTicket({ id: req.params.id });
    res.json(result);
  } catch (err) {
    handleTicketsError(res, err, "Error deleting ticket:", "Failed to delete ticket");
  }
};

module.exports = {
  getAllowedSteps,
  transitionTicket,
  getFilterOptions,
  getTicketsList,
  searchTickets,
  exportTickets,
  getAllTickets,
  getTicketEvents,
  getTicketDetail,
  createTicket,
  updateTicket,
  deleteTicket,
};
