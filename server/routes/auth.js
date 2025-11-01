// server/routes/auth.js

const express = require("express");
const router = express.Router();
const db = require("../db/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required." });

  try {
    const user = db
      .prepare(
        `SELECT id, name, email, password_hash, role_id, active FROM employees WHERE email = ?`
      )
      .get(email);

    if (!user) return res.status(401).json({ error: "Invalid email or password." });
    if (!user.active) return res.status(403).json({ error: "Account is inactive." });

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword)
      return res.status(401).json({ error: "Invalid email or password." });

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role_id: user.role_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.role_id,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
