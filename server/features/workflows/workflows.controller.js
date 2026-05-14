// server/features/workflows/workflows.controller.js

const workflowsService = require("./workflows.service");

const sendWorkflowError = (res, err, { logMessage, fallbackBody }) => {
  if (workflowsService.isWorkflowsServiceError(err)) {
    return res.status(err.status).json(err.body);
  }

  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  console.error(logMessage, err);
  return res.status(500).json(fallbackBody);
};

const listActiveWorkflows = async (req, res) => {
  const { project_id: projectId } = req.query;

  try {
    const workflows = await workflowsService.getActiveWorkflows({
      projectId,
      user: req.user,
    });
    res.json(workflows);
  } catch (err) {
    sendWorkflowError(res, err, {
      logMessage: "Failed to fetch workflows:",
      fallbackBody: { error: "Failed to fetch workflows" },
    });
  }
};

const getActiveWorkflow = async (req, res) => {
  try {
    const workflow = await workflowsService.getActiveWorkflowById({
      id: req.params.id,
    });
    res.json(workflow);
  } catch (err) {
    sendWorkflowError(res, err, {
      logMessage: "Failed to fetch workflow:",
      fallbackBody: { error: "Failed to fetch workflow" },
    });
  }
};

const getAllowedSteps = async (req, res) => {
  try {
    const steps = await workflowsService.getAllowedStepsForTicket({
      ticketId: req.params.ticketId,
    });
    res.json(steps);
  } catch (err) {
    sendWorkflowError(res, err, {
      logMessage: "Failed to fetch workflow steps:",
      fallbackBody: { error: "Failed to fetch workflow steps" },
    });
  }
};

const listWorkflowTransitions = async (req, res) => {
  try {
    const transitions = await workflowsService.getWorkflowTransitions({
      workflowId: req.query.workflow_id,
    });
    res.json(transitions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch workflow transitions" });
  }
};

const listWorkflowTransitionsForStep = async (req, res) => {
  try {
    const transitions = await workflowsService.getWorkflowTransitionsForStep({
      stepCode: req.params.step_code,
    });
    res.json(transitions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch transitions for step" });
  }
};

const updateWorkflowTransition = async (req, res) => {
  try {
    const transition = await workflowsService.updateWorkflowTransition({
      id: req.params.id,
      body: req.body,
    });
    res.json(transition);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update transition" });
  }
};

const createWorkflowTransition = async (req, res) => {
  try {
    const transition = await workflowsService.createWorkflowTransition({
      body: req.body,
    });
    res.json(transition);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create transition" });
  }
};

const deleteWorkflowTransition = async (req, res) => {
  try {
    const result = await workflowsService.deleteWorkflowTransition({
      id: req.params.id,
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete transition" });
  }
};

const listWorkflowSummaries = async (req, res) => {
  try {
    const summaries = await workflowsService.getWorkflowSummaries();
    res.json(summaries);
  } catch (err) {
    console.error("Failed to fetch workflow summaries:", err);
    res.status(500).json({ error: "Failed to fetch workflow summaries" });
  }
};

const listManagedWorkflows = async (req, res) => {
  try {
    const workflows = await workflowsService.getManagedWorkflows();
    res.json(workflows);
  } catch (err) {
    console.error("Failed to fetch workflows:", err);
    res.status(500).json({ error: "Failed to fetch workflows" });
  }
};

const getManagedWorkflow = async (req, res) => {
  try {
    const workflow = await workflowsService.getManagedWorkflowById({
      id: req.params.id,
    });
    res.json(workflow);
  } catch (err) {
    sendWorkflowError(res, err, {
      logMessage: "Failed to fetch workflow:",
      fallbackBody: { error: "Failed to fetch workflow" },
    });
  }
};

const createManagedWorkflow = async (req, res) => {
  try {
    const result = await workflowsService.createManagedWorkflow({
      body: req.body,
      user: req.user,
    });
    res.json(result);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    sendWorkflowError(res, err, {
      logMessage: "Failed to create workflow:",
      fallbackBody: { error: "Failed to create workflow", detail: err.detail || err.message },
    });
  }
};

const updateManagedWorkflow = async (req, res) => {
  try {
    const result = await workflowsService.updateManagedWorkflow({
      id: req.params.id,
      body: req.body,
      user: req.user,
    });
    res.json(result);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    sendWorkflowError(res, err, {
      logMessage: "Failed to update workflow:",
      fallbackBody: { error: "Failed to update workflow", detail: err.detail || err.message },
    });
  }
};

const setWorkflowActive = async (req, res) => {
  try {
    const result = await workflowsService.setWorkflowActive({
      id: req.params.id,
      body: req.body,
      user: req.user,
    });
    res.json(result);
  } catch (err) {
    sendWorkflowError(res, err, {
      logMessage: "Failed to toggle workflow active:",
      fallbackBody: { error: "Failed to toggle workflow active" },
    });
  }
};

const deleteManagedWorkflow = async (req, res) => {
  try {
    const result = await workflowsService.deleteManagedWorkflow({
      id: req.params.id,
      user: req.user,
    });
    res.json(result);
  } catch (err) {
    sendWorkflowError(res, err, {
      logMessage: "Failed to delete workflow:",
      fallbackBody: { error: "Failed to delete workflow" },
    });
  }
};

module.exports = {
  listActiveWorkflows,
  getActiveWorkflow,
  getAllowedSteps,
  listWorkflowTransitions,
  listWorkflowTransitionsForStep,
  updateWorkflowTransition,
  createWorkflowTransition,
  deleteWorkflowTransition,
  listWorkflowSummaries,
  listManagedWorkflows,
  getManagedWorkflow,
  createManagedWorkflow,
  updateManagedWorkflow,
  setWorkflowActive,
  deleteManagedWorkflow,
};
