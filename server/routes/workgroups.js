// server/routes/workgroups.js
const express = require("express");
const db = require("../db/db");
const router = express.Router();

// GET all workgroups
router.get("/", (req, res) => {
  try {
    const rows = db.prepare("SELECT id, name FROM workgroups").all();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch workgroups" });
  }
});

module.exports = router;
