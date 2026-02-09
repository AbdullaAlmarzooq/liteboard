// server/routes/workgroups.js
const express = require("express");
const db = require("../db/db");
const router = express.Router();

// GET all workgroups
router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT id, ticket_code, name, description FROM workgroups");

    // Ensure we always return an array
    res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error("Error fetching workgroups:", err);
    res.status(500).json({ error: "Failed to fetch workgroups" });
  }
});

module.exports = router;
