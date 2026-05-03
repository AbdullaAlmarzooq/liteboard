// server/features/workgroups/workgroups.routes.js

const express = require("express");
const authenticateToken = require("../../middleware/authMiddleware");
const workgroupsController = require("./workgroups.controller");

const router = express.Router();

router.get("/", workgroupsController.listWorkgroups);
router.post("/", authenticateToken([1]), workgroupsController.createWorkgroup);
router.put("/:id", authenticateToken([1]), workgroupsController.updateWorkgroup);
router.delete("/:id", authenticateToken([1]), workgroupsController.deleteWorkgroup);

module.exports = router;
