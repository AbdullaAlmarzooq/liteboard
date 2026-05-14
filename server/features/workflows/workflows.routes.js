// server/features/workflows/workflows.routes.js

const express = require("express");
const authenticateToken = require("../../middleware/authMiddleware");
const workflowsController = require("./workflows.controller");

const workflowsRouter = express.Router();
const workflowStepsRouter = express.Router();
const workflowTransitionsRouter = express.Router();
const workflowManagementRouter = express.Router();

workflowsRouter.get("/", authenticateToken(), workflowsController.listActiveWorkflows);
workflowsRouter.get("/:id", authenticateToken(), workflowsController.getActiveWorkflow);

workflowStepsRouter.get("/allowed/:ticketId", workflowsController.getAllowedSteps);

workflowTransitionsRouter.get("/", workflowsController.listWorkflowTransitions);
workflowTransitionsRouter.get("/step/:step_code", workflowsController.listWorkflowTransitionsForStep);
workflowTransitionsRouter.put("/:id", workflowsController.updateWorkflowTransition);
workflowTransitionsRouter.post("/", workflowsController.createWorkflowTransition);
workflowTransitionsRouter.delete("/:id", workflowsController.deleteWorkflowTransition);

workflowManagementRouter.use(authenticateToken([1]));
workflowManagementRouter.get("/list", workflowsController.listWorkflowSummaries);
workflowManagementRouter.get("/", workflowsController.listManagedWorkflows);
workflowManagementRouter.get("/:id", workflowsController.getManagedWorkflow);
workflowManagementRouter.post("/", workflowsController.createManagedWorkflow);
workflowManagementRouter.patch("/:id", workflowsController.updateManagedWorkflow);
workflowManagementRouter.patch("/:id/active", workflowsController.setWorkflowActive);
workflowManagementRouter.delete("/:id", workflowsController.deleteManagedWorkflow);

module.exports = {
  workflowsRouter,
  workflowStepsRouter,
  workflowTransitionsRouter,
  workflowManagementRouter,
};
