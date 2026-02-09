// server/routes/auth.js

const express = require("express");
const router = express.Router();
const db = require("../db/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required." });

  try {
    const { rows } = await db.query(
      `
        SELECT e.id, e.name, e.email, e.password_hash, e.role_id, e.workgroup_id, e.active,
               r.name AS role_name,
               wg.name AS workgroup_name
        FROM employees e
        LEFT JOIN roles r ON e.role_id = r.id
        LEFT JOIN workgroups wg ON e.workgroup_id = wg.id
        WHERE e.email = $1
      `,
      [email]
    );
    const user = rows[0];

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
        role_name: user.role_name,
        workgroup_id: user.workgroup_id,
        workgroup_name: user.workgroup_name,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
