// server/db/db.js
require("dotenv").config();
const { Pool } = require("pg");

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
