// server/features/tickets/tickets.routes.js

const express = require("express");
const authenticateToken = require("../../middleware/authMiddleware");
const ensureProjectAccess = require("../../middleware/ensureProjectAccess");
const ensureSameWorkgroup = require("../../middleware/ensureSameWorkgroup");
const { ensureTicketIsEditable } = require("../../middleware/ensureTicketIsEditable");
const ticketsController = require("./tickets.controller");

const router = express.Router();

// ----------------------------------------------------------------------
// GET allowed next steps for a ticket (any logged-in user)
// ----------------------------------------------------------------------
// Fixed: Using authenticateToken() (no roles needed, just authentication)
router.get("/:id/allowed-steps", authenticateToken(), ticketsController.getAllowedSteps);

// ----------------------------------------------------------------------
// POST update ticket status (workflow transition)
// (Admins + Editors only)
// ----------------------------------------------------------------------
// Fixed: Using authenticateToken([1, 2]) (Admins and Editors)
router.post(
  "/:id/transition",
  authenticateToken([1, 2]),
  ensureProjectAccess,
  ensureTicketIsEditable({ paramKey: "id" }),
  ensureSameWorkgroup,
  ticketsController.transitionTicket
);

// ----------------------------------------------------------------------
// GET filter options for Tickets page filters (any logged-in user)
// ----------------------------------------------------------------------
router.get("/filter-options", authenticateToken(), ticketsController.getFilterOptions);

// ----------------------------------------------------------------------
// GET lightweight tickets list for Tickets page (any logged-in user)
// NOTE: Keeps GET /api/tickets unchanged for backward compatibility.
// ----------------------------------------------------------------------
router.get("/list", authenticateToken(), ticketsController.getTicketsList);

// ----------------------------------------------------------------------
// GET search results for Tickets page (any logged-in user)
// ----------------------------------------------------------------------
router.get("/search", authenticateToken(), ticketsController.searchTickets);

// ----------------------------------------------------------------------
// GET export data for Tickets page CSV (any logged-in user)
// ----------------------------------------------------------------------
router.get("/export", authenticateToken(), ticketsController.exportTickets);

// ----------------------------------------------------------------------
// GET all tickets (any logged-in user)
// ----------------------------------------------------------------------
// Fixed: Using authenticateToken()
router.get("/", authenticateToken(), ticketsController.getAllTickets);

// ----------------------------------------------------------------------
// GET ticket events (any logged-in user with project access)
// ----------------------------------------------------------------------
router.get("/:id/events", authenticateToken(), ensureProjectAccess, ticketsController.getTicketEvents);

// ----------------------------------------------------------------------
// GET single ticket (any logged-in user)
// ----------------------------------------------------------------------
// Fixed: Using authenticateToken()
router.get("/:id", authenticateToken(), ensureProjectAccess, ticketsController.getTicketDetail);

// ----------------------------------------------------------------------
// CREATE ticket (Admins + Editors only)
// ----------------------------------------------------------------------
router.post("/", authenticateToken([1, 2]), ticketsController.createTicket);

// ----------------------------------------------------------------------
// UPDATE ticket (Admins + Editors only), must be same workgroup unless Admin)
// ----------------------------------------------------------------------
router.put(
  "/:id",
  authenticateToken([1, 2]),
  ensureProjectAccess,
  ensureTicketIsEditable({ paramKey: "id" }),
  ensureSameWorkgroup,
  ticketsController.updateTicket
);

// ----------------------------------------------------------------------
// DELETE ticket (Admins only)
// ----------------------------------------------------------------------
// Fixed: Using authenticateToken([1]) (Admins only)
router.delete(
  "/:id",
  authenticateToken([1]),
  ensureProjectAccess,
  ensureTicketIsEditable({ paramKey: "id" }),
  ticketsController.deleteTicket
);

module.exports = router;
