// server/server.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const ticketsRouter = require("./features/tickets");
const workgroupsRouter = require("./routes/workgroups");
const statusHistoryRouter = require("./features/tickets/status-history.routes");
const workflowsRouter = require("./routes/workflows");
const { tagsRouter, ticketTagsRouter } = require("./features/tags");
const workflowStepsRouter = require("./routes/workflowSteps");
const commentsRouter = require("./features/comments");
const attachmentsRouter = require("./features/attachments");
const employeesRouter = require("./routes/employees");
const modulesRouter = require("./routes/modules");
const workflowTransitionsRouter = require('./routes/workflow_transitions');
const workflowManagementRouter = require('./routes/workflowManagement');
const projectsRouter = require("./routes/projects");
const auditLogsRouter = require("./routes/auditLogs");
const authRouter = require("./routes/auth");
const profileStats = require("./routes/profile/stats");
const profileOverviewRoutes = require("./routes/profile/overview");
const profileActivityRoutes = require("./routes/profile/activity");
const myTicketsRoutes = require("./routes/profile/myTickets");
const myPasswordRoutes = require("./routes/profile/myPassword");



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
app.use("/api/profile", profileStats);
app.use("/api/profile", profileOverviewRoutes);
app.use("/api/profile", profileActivityRoutes);
app.use("/api/profile", myTicketsRoutes);
app.use("/api/profile", myPasswordRoutes);




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
