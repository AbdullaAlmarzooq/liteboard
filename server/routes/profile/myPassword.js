// routes/profile/myPassword.js
const express = require("express");
const router = express.Router();
const db = require("../../db/db");
const bcrypt = require("bcryptjs");
const authenticateToken = require("../../middleware/authMiddleware");

// PATCH /api/profile/myPassword
router.patch("/myPassword", authenticateToken(), async (req, res) => {
  const userId = req.user.id;
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: "Both fields are required" });
  }

  try {
    const userResult = await db.query(
      "SELECT id, password_hash FROM employees WHERE id = $1",
      [userId]
    );
    const user = userResult.rows[0];

    if (!user) return res.status(404).json({ error: "User not found" });

    // Check old password
    const isMatch = bcrypt.compareSync(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(new_password, salt);

    await db.query(
      "UPDATE employees SET password_hash = $1 WHERE id = $2",
      [newHash, userId]
    );

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Password change error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
