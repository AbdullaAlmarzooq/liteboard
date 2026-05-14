// server/features/modules/modules.routes.js

const express = require("express");
const authenticateToken = require("../../middleware/authMiddleware");
const modulesController = require("./modules.controller");

const router = express.Router();

router.get("/", authenticateToken(), modulesController.listModules);
router.get("/:id", authenticateToken(), modulesController.getModule);
router.post("/", authenticateToken([1]), modulesController.createModule);
router.put("/:id", authenticateToken([1]), modulesController.updateModule);
router.delete("/:id", authenticateToken([1]), modulesController.deleteModule);

module.exports = router;
