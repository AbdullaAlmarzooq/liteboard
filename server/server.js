// server/server.js

const express = require("express");
const cors = require("cors");
const ticketsRouter = require("./routes/tickets");
const workgroupsRouter = require("./routes/workgroups");
const statusHistoryRouter = require("./routes/status_history");
const workflowsRouter = require("./routes/workflows");
const tagsRouter = require("./routes/tags");
const workflowStepsRouter = require("./routes/workflowSteps");
const commentsRouter = require("./routes/comments");
const attachmentsRouter = require("./routes/attachments");
const employeesRouter = require("./routes/employees");
const modulesRouter = require("./routes/modules");
const ticketTagsRouter = require("./routes/tickets_tags");
const workflowTransitionsRouter = require('./routes/workflow_transitions');
const workflowManagementRouter = require('./routes/workflowManagement');
const authRouter = require("./routes/auth");

const app = express();
const PORT = 8000;

// Middleware
app.use(cors());
app.use(express.json());

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
app.use("/api/auth", authRouter);




// Root check
app.get("/", (req, res) => {
  res.json({ message: "Liteboard API is running 🚀" });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});