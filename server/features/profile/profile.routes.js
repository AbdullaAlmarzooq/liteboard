// server/features/profile/profile.routes.js

const express = require("express");
const authenticateToken = require("../../middleware/authMiddleware");
const profileController = require("./profile.controller");

const router = express.Router();

router.get("/stats", authenticateToken(), profileController.getStats);
router.get("/overview", authenticateToken(), profileController.getOverview);
router.get("/activity", authenticateToken(), profileController.getActivity);
router.get("/activity/global", authenticateToken([1]), profileController.getGlobalActivity);
router.get("/my-tickets", authenticateToken(), profileController.getMyTickets);
router.patch("/myPassword", authenticateToken(), profileController.updateMyPassword);

module.exports = router;
