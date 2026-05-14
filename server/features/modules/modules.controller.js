// server/features/modules/modules.controller.js

const modulesService = require("./modules.service");

const sendModuleError = (res, err, { logMessage, fallbackBody }) => {
  if (modulesService.isModulesServiceError(err)) {
    return res.status(err.status).json(err.body);
  }

  console.error(logMessage, err);
  return res.status(500).json(fallbackBody);
};

const listModules = async (req, res) => {
  try {
    const modules = await modulesService.listModules({
      query: req.query,
      user: req.user,
    });
    res.json(modules);
  } catch (err) {
    sendModuleError(res, err, {
      logMessage: "Error fetching modules:",
      fallbackBody: { error: "Failed to fetch modules" },
    });
  }
};

const getModule = async (req, res) => {
  try {
    const module = await modulesService.getModuleById({ id: req.params.id });
    res.json(module);
  } catch (err) {
    sendModuleError(res, err, {
      logMessage: "Error fetching module:",
      fallbackBody: { error: "Failed to fetch module" },
    });
  }
};

const createModule = async (req, res) => {
  try {
    const module = await modulesService.createModule({
      body: req.body,
      user: req.user,
    });
    res.status(201).json(module);
  } catch (err) {
    sendModuleError(res, err, {
      logMessage: "Error creating module:",
      fallbackBody: { error: "Failed to create module" },
    });
  }
};

const updateModule = async (req, res) => {
  try {
    const result = await modulesService.updateModule({
      id: req.params.id,
      body: req.body,
      user: req.user,
    });
    res.json(result);
  } catch (err) {
    sendModuleError(res, err, {
      logMessage: "Error updating module:",
      fallbackBody: { error: "Failed to update module" },
    });
  }
};

const deleteModule = async (req, res) => {
  try {
    const result = await modulesService.deleteModule({
      id: req.params.id,
      user: req.user,
    });
    res.json(result);
  } catch (err) {
    sendModuleError(res, err, {
      logMessage: "Error deleting module:",
      fallbackBody: { error: "Failed to delete module" },
    });
  }
};

module.exports = {
  listModules,
  getModule,
  createModule,
  updateModule,
  deleteModule,
};
