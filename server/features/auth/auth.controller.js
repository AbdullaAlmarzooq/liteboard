// server/features/auth/auth.controller.js

const authService = require("./auth.service");

const login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    if (authService.isAuthServiceError(err)) {
      return res.status(err.status).json(err.body);
    }

    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

module.exports = {
  login,
};
