// routes/profile/myPassword.js
const express = require("express");
const router = express.Router();
const db = require("../../db/db");
const bcrypt = require("bcryptjs");
const authenticateToken = require("../../middleware/authMiddleware");

// PATCH /api/profile/myPassword
router.patch("/myPassword", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: "Both fields are required" });
  }

  try {
    // Fetch user
    const user = db
      .prepare("SELECT id, password_hash FROM employees WHERE id = ?")
      .get(userId);

    if (!user) return res.status(404).json({ error: "User not found" });

    // Check old password
    const isMatch = bcrypt.compareSync(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(new_password, salt);

    db.prepare("UPDATE employees SET password_hash = ? WHERE id = ?")
      .run(newHash, userId);

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Password change error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
