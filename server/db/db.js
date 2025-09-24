// server/db/db.js
const Database = require("better-sqlite3");
const path = require("path");

// Point to liteboard.db inside /server/db/
const dbPath = path.resolve(__dirname, "liteboard.db");
const db = new Database(dbPath, { verbose: console.log });

module.exports = db;
