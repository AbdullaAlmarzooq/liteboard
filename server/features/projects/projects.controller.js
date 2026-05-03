// server/features/projects/projects.controller.js

const projectsService = require("./projects.service");

const sendProjectError = (res, err, { logMessage, fallbackBody }) => {
  if (projectsService.isProjectsServiceError(err)) {
    return res.status(err.status).json(err.body);
  }

  console.error(logMessage, err);
  return res.status(500).json(fallbackBody);
};

const listAvailableProjects = async (req, res) => {
  try {
    const rows = await projectsService.listReadableProjects(req.user, {
      includeAssignments: false,
    });
    res.json(rows);
  } catch (err) {
    sendProjectError(res, err, {
      logMessage: "Failed to fetch available projects:",
      fallbackBody: { error: "Failed to fetch available projects" },
    });
  }
};

const listProjects = async (req, res) => {
  try {
    const includeAssignments = Number(req.user?.role_id) === 1;
    const projects = await projectsService.listReadableProjects(req.user, {
      includeAssignments,
    });
    res.json(projects);
  } catch (err) {
    sendProjectError(res, err, {
      logMessage: "Failed to fetch projects:",
      fallbackBody: { error: "Failed to fetch projects" },
    });
  }
};

const getProjectDashboard = async (req, res) => {
  try {
    const rows = await projectsService.getProjectDashboard({ user: req.user });
    res.json(rows);
  } catch (err) {
    sendProjectError(res, err, {
      logMessage: "Failed to fetch project dashboard data:",
      fallbackBody: { error: "Failed to fetch project dashboard data" },
    });
  }
};

const listProjectSummaries = async (req, res) => {
  try {
    const projects = await projectsService.listProjectSummaries();
    res.json(projects);
  } catch (err) {
    sendProjectError(res, err, {
      logMessage: "Failed to fetch project summaries:",
      fallbackBody: { error: "Failed to fetch project summaries" },
    });
  }
};

const getProject = async (req, res) => {
  try {
    const project = await projectsService.getProjectById({ id: req.params.id });
    res.json(project);
  } catch (err) {
    sendProjectError(res, err, {
      logMessage: "Failed to fetch project:",
      fallbackBody: { error: "Failed to fetch project" },
    });
  }
};

const createProject = async (req, res) => {
  try {
    const result = await projectsService.createProject({
      body: req.body,
      user: req.user,
    });
    res.status(201).json(result);
  } catch (err) {
    sendProjectError(res, err, {
      logMessage: "Failed to create project:",
      fallbackBody: { error: "Failed to create project" },
    });
  }
};

const updateProject = async (req, res) => {
  try {
    const result = await projectsService.updateProject({
      id: req.params.id,
      body: req.body,
      user: req.user,
    });
    res.json(result);
  } catch (err) {
    sendProjectError(res, err, {
      logMessage: "Failed to update project:",
      fallbackBody: { error: "Failed to update project" },
    });
  }
};

const updateProjectWorkgroups = async (req, res) => {
  try {
    const result = await projectsService.updateProjectWorkgroups({
      id: req.params.id,
      body: req.body,
      user: req.user,
    });
    res.json(result);
  } catch (err) {
    sendProjectError(res, err, {
      logMessage: "Failed to update project workgroups:",
      fallbackBody: { error: "Failed to update project workgroups" },
    });
  }
};

const updateProjectWorkflows = async (req, res) => {
  try {
    const result = await projectsService.updateProjectWorkflows({
      id: req.params.id,
      body: req.body,
      user: req.user,
    });
    res.json(result);
  } catch (err) {
    sendProjectError(res, err, {
      logMessage: "Failed to update project workflows:",
      fallbackBody: { error: "Failed to update project workflows" },
    });
  }
};

const updateProjectModules = async (req, res) => {
  try {
    const result = await projectsService.updateProjectModules({
      id: req.params.id,
      body: req.body,
      user: req.user,
    });
    res.json(result);
  } catch (err) {
    sendProjectError(res, err, {
      logMessage: "Failed to update project modules:",
      fallbackBody: { error: "Failed to update project modules" },
    });
  }
};

module.exports = {
  listAvailableProjects,
  listProjects,
  getProjectDashboard,
  listProjectSummaries,
  getProject,
  createProject,
  updateProject,
  updateProjectWorkgroups,
  updateProjectWorkflows,
  updateProjectModules,
};
