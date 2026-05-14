// server/server.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const ticketsRouter = require("./features/tickets");
const workgroupsRouter = require("./features/workgroups");
const statusHistoryRouter = require("./features/tickets/status-history.routes");
const {
  workflowsRouter,
  workflowStepsRouter,
  workflowTransitionsRouter,
  workflowManagementRouter,
} = require("./features/workflows");
const { tagsRouter, ticketTagsRouter } = require("./features/tags");
const commentsRouter = require("./features/comments");
const attachmentsRouter = require("./features/attachments");
const employeesRouter = require("./features/employees");
const modulesRouter = require("./features/modules");
const projectsRouter = require("./features/projects");
const auditLogsRouter = require("./features/audit-logs");
const authRouter = require("./features/auth");
const profileRouter = require("./features/profile");



const app = express();
const PORT = 8000;
const JSON_BODY_LIMIT = "2mb";

// Middleware
app.use(cors());
app.use(express.json({ limit: JSON_BODY_LIMIT }));

// Routes
app.use("/api/tickets", ticketsRouter);
app.use("/api/workgroups", workgroupsRouter);
app.use("/api/status_history", statusHistoryRouter);
app.use("/api/workflows", workflowsRouter);
app.use("/api/tags", tagsRouter);
app.use("/api/workflow_steps", workflowStepsRouter);
app.use("/api/comments", commentsRouter);
app.use("/api/attachments", attachmentsRouter);
app.use("/api/employees", employeesRouter);
app.use("/api/modules", modulesRouter);
app.use("/api/ticket_tags", ticketTagsRouter);
app.use("/api/workflow_transitions", workflowTransitionsRouter);
app.use("/api/workflow_management", workflowManagementRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/audit-logs", auditLogsRouter);
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);




// Root check
app.get("/", (req, res) => {
  res.json({ message: "Liteboard API is running 🚀" });
});

app.use((err, req, res, next) => {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({
      error: "Request body too large. Attachments are limited to 1 MB.",
    });
  }

  next(err);
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
