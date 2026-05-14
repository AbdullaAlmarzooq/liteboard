// server/features/projects/projects.routes.js

const express = require("express");
const authenticateToken = require("../../middleware/authMiddleware");
const projectsController = require("./projects.controller");

const router = express.Router();

router.get("/available", authenticateToken(), projectsController.listAvailableProjects);
router.get("/", authenticateToken(), projectsController.listProjects);
router.get("/dashboard", authenticateToken(), projectsController.getProjectDashboard);

router.use(authenticateToken([1]));

router.get("/list", projectsController.listProjectSummaries);
router.get("/:id", projectsController.getProject);
router.post("/", projectsController.createProject);
router.put("/:id", projectsController.updateProject);
router.put("/:id/workgroups", projectsController.updateProjectWorkgroups);
router.put("/:id/workflows", projectsController.updateProjectWorkflows);
router.put("/:id/modules", projectsController.updateProjectModules);

module.exports = router;
