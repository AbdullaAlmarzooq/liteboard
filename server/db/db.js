// server/db/db.js
const Database = require("better-sqlite3");
const path = require("path");

// Point to liteboard.db inside /server/db/
const dbPath = path.resolve(__dirname, "liteboard.db");
const db = new Database(dbPath, { verbose: console.log });

const ticketTriggers = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='trigger' AND tbl_name='tickets'").all();
console.log('\n=== TICKETS TABLE TRIGGERS ===');
console.log(ticketTriggers);
console.log('================================\n');


module.exports = db;