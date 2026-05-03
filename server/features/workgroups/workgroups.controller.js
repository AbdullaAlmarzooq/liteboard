// server/features/workgroups/workgroups.controller.js

const workgroupsService = require("./workgroups.service");

const sendWorkgroupError = (res, err, { logMessage, fallbackBody }) => {
  if (workgroupsService.isWorkgroupsServiceError(err)) {
    return res.status(err.status).json(err.body);
  }

  console.error(logMessage, err);
  return res.status(500).json(fallbackBody);
};

const listWorkgroups = async (req, res) => {
  try {
    const workgroups = await workgroupsService.listWorkgroups();
    res.json(workgroups);
  } catch (err) {
    sendWorkgroupError(res, err, {
      logMessage: "Error fetching workgroups:",
      fallbackBody: { error: "Failed to fetch workgroups" },
    });
  }
};

const createWorkgroup = async (req, res) => {
  try {
    const workgroup = await workgroupsService.createWorkgroup({
      body: req.body,
      user: req.user,
    });
    res.status(201).json(workgroup);
  } catch (err) {
    sendWorkgroupError(res, err, {
      logMessage: "Error creating workgroup:",
      fallbackBody: { error: "Failed to create workgroup" },
    });
  }
};

const updateWorkgroup = async (req, res) => {
  try {
    const workgroup = await workgroupsService.updateWorkgroup({
      id: req.params.id,
      body: req.body,
      user: req.user,
    });
    res.json(workgroup);
  } catch (err) {
    sendWorkgroupError(res, err, {
      logMessage: "Error updating workgroup:",
      fallbackBody: { error: "Failed to update workgroup" },
    });
  }
};

const deleteWorkgroup = async (req, res) => {
  try {
    const result = await workgroupsService.deleteWorkgroup({
      id: req.params.id,
      user: req.user,
    });
    res.json(result);
  } catch (err) {
    sendWorkgroupError(res, err, {
      logMessage: "Error deleting workgroup:",
      fallbackBody: { error: "Failed to delete workgroup" },
    });
  }
};

module.exports = {
  listWorkgroups,
  createWorkgroup,
  updateWorkgroup,
  deleteWorkgroup,
};
