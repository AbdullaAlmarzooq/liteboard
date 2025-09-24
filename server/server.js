// server/server.js
const express = require("express");
const cors = require("cors");
const ticketsRouter = require("./routes/tickets");
const workgroupsRouter = require("./routes/workgroups");

const app = express();
const PORT = 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/tickets", ticketsRouter);
app.use("/api/workgroups", workgroupsRouter);

// Root check
app.get("/", (req, res) => {
  res.json({ message: "Liteboard API is running 🚀" });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
