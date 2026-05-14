// server/features/profile/profile.controller.js

const profileService = require("./profile.service");

const sendProfileError = (res, err, { logMessage, fallbackBody }) => {
  if (profileService.isProfileServiceError(err)) {
    return res.status(err.status).json(err.body);
  }

  console.error(logMessage, err);
  return res.status(500).json(fallbackBody);
};

const getActivity = async (req, res) => {
  try {
    const result = await profileService.getActivity({
      user: req.user,
      query: req.query,
    });
    res.json(result);
  } catch (err) {
    sendProfileError(res, err, {
      logMessage: "Error fetching user activity:",
      fallbackBody: { error: "Failed to fetch recent activity" },
    });
  }
};

const getGlobalActivity = async (req, res) => {
  try {
    const result = await profileService.getGlobalActivity({ query: req.query });
    res.json(result);
  } catch (err) {
    sendProfileError(res, err, {
      logMessage: "Error fetching global activity:",
      fallbackBody: { error: "Failed to fetch global activity" },
    });
  }
};

const updateMyPassword = async (req, res) => {
  try {
    const result = await profileService.updateMyPassword({
      user: req.user,
      body: req.body,
    });
    res.json(result);
  } catch (err) {
    sendProfileError(res, err, {
      logMessage: "Password change error:",
      fallbackBody: { error: "Server error" },
    });
  }
};

const getMyTickets = async (req, res) => {
  try {
    const result = await profileService.getMyTickets({
      user: req.user,
      query: req.query,
    });
    res.json(result);
  } catch (err) {
    sendProfileError(res, err, {
      logMessage: "Error fetching my workgroup tickets:",
      fallbackBody: { error: "Failed to load tickets for your workgroup" },
    });
  }
};

const getOverview = async (req, res) => {
  try {
    const result = await profileService.getOverview({ user: req.user });
    res.json(result);
  } catch (err) {
    sendProfileError(res, err, {
      logMessage: "Error fetching profile overview:",
      fallbackBody: { error: "Failed to fetch profile overview" },
    });
  }
};

const getStats = async (req, res) => {
  try {
    const result = await profileService.getStats({ user: req.user });
    res.json(result);
  } catch (err) {
    sendProfileError(res, err, {
      logMessage: "Error fetching profile stats:",
      fallbackBody: { error: "Failed to fetch stats" },
    });
  }
};

module.exports = {
  getActivity,
  getGlobalActivity,
  updateMyPassword,
  getMyTickets,
  getOverview,
  getStats,
};
