// server/db/db.js
require("dotenv").config();
const { Pool, types } = require("pg");

// Keep PostgreSQL DATE columns as YYYY-MM-DD strings. Parsing them as
// JavaScript Date objects shifts date-only values across timezones.
types.setTypeParser(1082, (value) => value);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set in environment.");
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
