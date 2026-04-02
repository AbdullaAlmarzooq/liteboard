const express = require("express");
const db = require("../db/db");
const authenticateToken = require("../middleware/authMiddleware");
const { buildProjectAccessFilter } = require("../utils/projectAccess");

const router = express.Router();

const listReadableProjects = async (user, { includeAssignments = false } = {}) => {
  const isAdmin = Number(user?.role_id) === 1;
  const { clause, params } = isAdmin
    ? { clause: "", params: [] }
    : await buildProjectAccessFilter(user, "p.id");

  const activeClause = isAdmin ? "" : "\n        AND p.active = TRUE";
  const { rows } = await db.query(
    `
      SELECT
        p.id,
        p.name,
        p.description,
        p.created_by,
        p.updated_by,
        p.active,
        p.created_at,
        p.updated_at
      FROM projects p
      WHERE 1 = 1${activeClause}${clause}
      ORDER BY p.active DESC, p.name ASC, p.id ASC
    `,
    params
  );

  if (!includeAssignments) {
    return rows;
  }

  const projectIds = rows.map((project) => project.id);
  if (!projectIds.length) {
    return [];
  }

  const projectMap = new Map(
    rows.map((row) => [
      row.id,
      {
        ...row,
        workgroups: [],
        workflows: [],
      },
    ])
  );

  const [workgroupsResult, workflowsResult] = await Promise.all([
    db.query(
      `
        SELECT
          pw.project_id,
          pw.workgroup_code,
          pw.created_by,
          pw.created_at,
          wg.id AS workgroup_id,
          wg.name,
          wg.description,
          wg.active
        FROM project_workgroups pw
        LEFT JOIN workgroups wg ON wg.ticket_code = pw.workgroup_code
        WHERE pw.project_id = ANY($1::text[])
        ORDER BY pw.project_id, wg.name ASC NULLS LAST, pw.workgroup_code ASC
      `,
      [projectIds]
    ),
    db.query(
      `
        SELECT
          pw.project_id,
          pw.workflow_id,
          pw.created_by,
          pw.created_at,
          w.name,
          w.description,
          w.active
        FROM project_workflows pw
        LEFT JOIN workflows w ON w.id = pw.workflow_id
        WHERE pw.project_id = ANY($1::text[])
        ORDER BY pw.project_id, w.name ASC NULLS LAST, pw.workflow_id ASC
      `,
      [projectIds]
    ),
  ]);

  for (const row of workgroupsResult.rows) {
    const project = projectMap.get(row.project_id);
    if (!project) continue;

    project.workgroups.push({
      id: row.workgroup_id,
      code: row.workgroup_code,
      name: row.name,
      description: row.description,
      active: row.active,
      assigned_at: row.created_at,
      assigned_by: row.created_by,
    });
  }

  for (const row of workflowsResult.rows) {
    const project = projectMap.get(row.project_id);
    if (!project) continue;

    project.workflows.push({
      id: row.workflow_id,
      name: row.name,
      description: row.description,
      active: row.active,
      assigned_at: row.created_at,
      assigned_by: row.created_by,
    });
  }

  return rows.map((row) => projectMap.get(row.id));
};

const listProjectSummaries = async () => {
  const { rows } = await db.query(
    `
      SELECT
        p.id,
        p.name,
        p.description,
        p.created_by,
        p.updated_by,
        p.active,
        p.created_at,
        p.updated_at,
        COALESCE(wg_counts.workgroup_count, 0)::int AS workgroup_count,
        COALESCE(wf_counts.workflow_count, 0)::int AS workflow_count
      FROM projects p
      LEFT JOIN (
        SELECT project_id, COUNT(*)::int AS workgroup_count
        FROM project_workgroups
        GROUP BY project_id
      ) wg_counts
        ON wg_counts.project_id = p.id
      LEFT JOIN (
        SELECT project_id, COUNT(*)::int AS workflow_count
        FROM project_workflows
        GROUP BY project_id
      ) wf_counts
        ON wf_counts.project_id = p.id
      ORDER BY p.active DESC, p.name ASC, p.id ASC
    `
  );

  return rows;
};

router.get("/available", authenticateToken(), async (req, res) => {
  try {
    const rows = await listReadableProjects(req.user, { includeAssignments: false });
    res.json(rows);
  } catch (err) {
    console.error("Failed to fetch available projects:", err);
    res.status(500).json({ error: "Failed to fetch available projects" });
  }
});

router.get("/", authenticateToken(), async (req, res) => {
  try {
    const includeAssignments = Number(req.user?.role_id) === 1;
    const projects = await listReadableProjects(req.user, { includeAssignments });
    res.json(projects);
  } catch (err) {
    console.error("Failed to fetch projects:", err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

router.get("/dashboard", authenticateToken(), async (req, res) => {
  try {
    const isAdmin = Number(req.user?.role_id) === 1;
    const { clause, params } = isAdmin
      ? { clause: "", params: [] }
      : await buildProjectAccessFilter(req.user, "p.id");

    const activeClause = isAdmin ? "" : "\n        AND p.active = TRUE";

    const { rows } = await db.query(
      `
        SELECT
          p.id,
          p.name,
          p.description,
          p.active,
          COALESCE(COUNT(*) FILTER (WHERE ws.category_code = 10), 0) AS open_count,
          COALESCE(COUNT(*) FILTER (WHERE ws.category_code = 20), 0) AS in_progress_count,
          COALESCE(COUNT(*) FILTER (WHERE ws.category_code = 30), 0) AS closed_count,
          COALESCE(COUNT(*) FILTER (WHERE ws.category_code = 40), 0) AS cancelled_count
        FROM projects p
        LEFT JOIN tickets t
          ON t.project_id = p.id
         AND t.deleted_at IS NULL
        LEFT JOIN workflow_steps ws
          ON ws.workflow_id = t.workflow_id
         AND ws.step_code = t.step_code
        WHERE 1 = 1${activeClause}${clause}
        GROUP BY p.id, p.name, p.description, p.active
        ORDER BY p.active DESC, p.name ASC, p.id ASC
      `,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error("Failed to fetch project dashboard data:", err);
    res.status(500).json({ error: "Failed to fetch project dashboard data" });
  }
});

router.use(authenticateToken([1]));

router.get("/list", async (req, res) => {
  try {
    const projects = await listProjectSummaries();
    res.json(projects);
  } catch (err) {
    console.error("Failed to fetch project summaries:", err);
    res.status(500).json({ error: "Failed to fetch project summaries" });
  }
});

const normalizeBoolean = (value, fallback) => {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
};

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const normalizeStringArray = (values) => {
  if (!Array.isArray(values)) return null;

  return [...new Set(
    values
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean)
  )];
};

const ensureNonEmptyAssignments = (values, fieldName) => {
  if (!values || values.length === 0) {
    const error = new Error(`${fieldName} must include at least one selection`);
    error.statusCode = 400;
    throw error;
  }
};

const generateProjectId = async () => {
  const { rows } = await db.query(
    `
      SELECT id
      FROM projects
      WHERE id ~ '^PRJ-[0-9]+$'
      ORDER BY CAST(SUBSTRING(id FROM 5) AS INTEGER) DESC
      LIMIT 1
    `
  );

  const currentId = rows[0]?.id;
  if (!currentId) {
    return "PRJ-001";
  }

  const currentNumber = Number.parseInt(currentId.replace("PRJ-", ""), 10);
  const nextNumber = Number.isNaN(currentNumber) ? 1 : currentNumber + 1;

  return `PRJ-${String(nextNumber).padStart(3, "0")}`;
};

const loadProjects = async (projectId = null) => {
  const params = [];
  let whereClause = "";

  if (projectId) {
    params.push(projectId);
    whereClause = "WHERE p.id = $1";
  }

  const projectsResult = await db.query(
    `
      SELECT
        p.id,
        p.name,
        p.description,
        p.created_by,
        p.updated_by,
        p.active,
        p.created_at,
        p.updated_at
      FROM projects p
      ${whereClause}
      ORDER BY p.name ASC, p.id ASC
    `,
    params
  );

  const projects = projectsResult.rows.map((row) => ({
    ...row,
    workgroups: [],
    workflows: [],
  }));

  if (!projects.length) {
    return projectId ? null : [];
  }

  const projectIds = projects.map((project) => project.id);
  const projectMap = new Map(projects.map((project) => [project.id, project]));

  const [workgroupsResult, workflowsResult] = await Promise.all([
    db.query(
      `
        SELECT
          pw.project_id,
          pw.workgroup_code,
          pw.created_by,
          pw.created_at,
          wg.id AS workgroup_id,
          wg.name,
          wg.description,
          wg.active
        FROM project_workgroups pw
        LEFT JOIN workgroups wg ON wg.ticket_code = pw.workgroup_code
        WHERE pw.project_id = ANY($1::text[])
        ORDER BY pw.project_id, wg.name ASC NULLS LAST, pw.workgroup_code ASC
      `,
      [projectIds]
    ),
    db.query(
      `
        SELECT
          pw.project_id,
          pw.workflow_id,
          pw.created_by,
          pw.created_at,
          w.name,
          w.description,
          w.active
        FROM project_workflows pw
        LEFT JOIN workflows w ON w.id = pw.workflow_id
        WHERE pw.project_id = ANY($1::text[])
        ORDER BY pw.project_id, w.name ASC NULLS LAST, pw.workflow_id ASC
      `,
      [projectIds]
    ),
  ]);

  for (const row of workgroupsResult.rows) {
    const project = projectMap.get(row.project_id);
    if (!project) continue;

    project.workgroups.push({
      id: row.workgroup_id,
      code: row.workgroup_code,
      name: row.name,
      description: row.description,
      active: row.active,
      assigned_at: row.created_at,
      assigned_by: row.created_by,
    });
  }

  for (const row of workflowsResult.rows) {
    const project = projectMap.get(row.project_id);
    if (!project) continue;

    project.workflows.push({
      id: row.workflow_id,
      name: row.name,
      description: row.description,
      active: row.active,
      assigned_at: row.created_at,
      assigned_by: row.created_by,
    });
  }

  return projectId ? projects[0] : projects;
};

const ensureProjectExists = async (projectId) => {
  const { rows } = await db.query(
    `
      SELECT id
      FROM projects
      WHERE id = $1
    `,
    [projectId]
  );

  return rows[0] || null;
};

const validateWorkgroupCodes = async (workgroupCodes) => {
  if (!workgroupCodes.length) {
    return;
  }

  const { rows } = await db.query(
    `
      SELECT ticket_code
      FROM workgroups
      WHERE ticket_code = ANY($1::text[])
    `,
    [workgroupCodes]
  );

  const existingCodes = new Set(rows.map((row) => row.ticket_code));
  const missingCodes = workgroupCodes.filter((code) => !existingCodes.has(code));

  if (missingCodes.length) {
    const error = new Error(`Unknown workgroup code(s): ${missingCodes.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }
};

const validateWorkflowIds = async (workflowIds) => {
  if (!workflowIds.length) {
    return;
  }

  const invalidIds = workflowIds.filter((id) => !isUuid(id));
  if (invalidIds.length) {
    const error = new Error(`Invalid workflow id(s): ${invalidIds.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  const { rows } = await db.query(
    `
      SELECT id
      FROM workflows
      WHERE id = ANY($1::uuid[])
    `,
    [workflowIds]
  );

  const existingIds = new Set(rows.map((row) => row.id));
  const missingIds = workflowIds.filter((id) => !existingIds.has(id));

  if (missingIds.length) {
    const error = new Error(`Unknown workflow id(s): ${missingIds.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }
};

const replaceProjectWorkgroups = async (client, projectId, workgroupCodes, actorId) => {
  await client.query(
    `
      DELETE FROM project_workgroups
      WHERE project_id = $1
    `,
    [projectId]
  );

  for (const workgroupCode of workgroupCodes) {
    await client.query(
      `
        INSERT INTO project_workgroups (project_id, workgroup_code, created_by)
        VALUES ($1, $2, $3)
      `,
      [projectId, workgroupCode, actorId]
    );
  }
};

const replaceProjectWorkflows = async (client, projectId, workflowIds, actorId) => {
  await client.query(
    `
      DELETE FROM project_workflows
      WHERE project_id = $1
    `,
    [projectId]
  );

  for (const workflowId of workflowIds) {
    await client.query(
      `
        INSERT INTO project_workflows (project_id, workflow_id, created_by)
        VALUES ($1, $2, $3)
      `,
      [projectId, workflowId, actorId]
    );
  }
};

router.get("/:id", async (req, res) => {
  try {
    const project = await loadProjects(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json(project);
  } catch (err) {
    console.error("Failed to fetch project:", err);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

router.post("/", async (req, res) => {
  const {
    id,
    name,
    description,
    active,
    workgroupCodes: rawWorkgroupCodes = [],
    workflowIds: rawWorkflowIds = [],
  } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "Project name is required" });
  }

  const workgroupCodes = normalizeStringArray(rawWorkgroupCodes);
  if (workgroupCodes === null) {
    return res.status(400).json({ error: "workgroupCodes must be an array of workgroup codes" });
  }

  const workflowIds = normalizeStringArray(rawWorkflowIds);
  if (workflowIds === null) {
    return res.status(400).json({ error: "workflowIds must be an array of workflow IDs" });
  }

  const projectId = id && String(id).trim() ? String(id).trim() : await generateProjectId();
  const actorId = req.user.id;
  const activeValue = normalizeBoolean(active, true);

  try {
    ensureNonEmptyAssignments(workgroupCodes, "workgroupCodes");
    ensureNonEmptyAssignments(workflowIds, "workflowIds");
    await validateWorkgroupCodes(workgroupCodes);
    await validateWorkflowIds(workflowIds);

    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `
          INSERT INTO projects (
            id, name, description, created_by, active, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        `,
        [projectId, String(name).trim(), description || null, actorId, activeValue]
      );

      await replaceProjectWorkgroups(client, projectId, workgroupCodes, actorId);
      await replaceProjectWorkflows(client, projectId, workflowIds, actorId);

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    const project = await loadProjects(projectId);
    res.status(201).json({
      message: "Project created successfully",
      project,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    if (err.code === "23505") {
      return res.status(409).json({ error: "Project ID already exists" });
    }

    console.error("Failed to create project:", err);
    res.status(500).json({ error: "Failed to create project" });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    active,
    workgroupCodes: rawWorkgroupCodes,
    workflowIds: rawWorkflowIds,
  } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "Project name is required" });
  }

  try {
    const existingProject = await ensureProjectExists(id);
    if (!existingProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    const workgroupCodes =
      rawWorkgroupCodes === undefined ? null : normalizeStringArray(rawWorkgroupCodes);
    if (rawWorkgroupCodes !== undefined && workgroupCodes === null) {
      return res.status(400).json({ error: "workgroupCodes must be an array of workgroup codes" });
    }

    const workflowIds =
      rawWorkflowIds === undefined ? null : normalizeStringArray(rawWorkflowIds);
    if (rawWorkflowIds !== undefined && workflowIds === null) {
      return res.status(400).json({ error: "workflowIds must be an array of workflow IDs" });
    }

    if (workgroupCodes !== null) {
      ensureNonEmptyAssignments(workgroupCodes, "workgroupCodes");
      await validateWorkgroupCodes(workgroupCodes);
    }

    if (workflowIds !== null) {
      ensureNonEmptyAssignments(workflowIds, "workflowIds");
      await validateWorkflowIds(workflowIds);
    }

    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `
          UPDATE projects
          SET
            name = $1,
            description = $2,
            active = COALESCE($3, active),
            updated_by = $4,
            updated_at = NOW()
          WHERE id = $5
        `,
        [
          String(name).trim(),
          description || null,
          normalizeBoolean(active, null),
          req.user.id,
          id,
        ]
      );

      if (workgroupCodes !== null) {
        await replaceProjectWorkgroups(client, id, workgroupCodes, req.user.id);
      }

      if (workflowIds !== null) {
        await replaceProjectWorkflows(client, id, workflowIds, req.user.id);
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    const project = await loadProjects(id);
    res.json({
      message: "Project updated successfully",
      project,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    console.error("Failed to update project:", err);
    res.status(500).json({ error: "Failed to update project" });
  }
});

router.put("/:id/workgroups", async (req, res) => {
  const { id } = req.params;
  const workgroupCodes = normalizeStringArray(req.body.workgroupCodes);

  if (workgroupCodes === null) {
    return res.status(400).json({ error: "workgroupCodes must be an array of workgroup codes" });
  }

  try {
    const project = await ensureProjectExists(id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    ensureNonEmptyAssignments(workgroupCodes, "workgroupCodes");
    await validateWorkgroupCodes(workgroupCodes);

    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");
      await replaceProjectWorkgroups(client, id, workgroupCodes, req.user.id);
      await client.query(
        `
          UPDATE projects
          SET updated_by = $1, updated_at = NOW()
          WHERE id = $2
        `,
        [req.user.id, id]
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    const updatedProject = await loadProjects(id);
    res.json({
      message: "Project workgroups updated successfully",
      project: updatedProject,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    console.error("Failed to update project workgroups:", err);
    res.status(500).json({ error: "Failed to update project workgroups" });
  }
});

router.put("/:id/workflows", async (req, res) => {
  const { id } = req.params;
  const workflowIds = normalizeStringArray(req.body.workflowIds);

  if (workflowIds === null) {
    return res.status(400).json({ error: "workflowIds must be an array of workflow IDs" });
  }

  try {
    const project = await ensureProjectExists(id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    ensureNonEmptyAssignments(workflowIds, "workflowIds");
    await validateWorkflowIds(workflowIds);

    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");
      await replaceProjectWorkflows(client, id, workflowIds, req.user.id);
      await client.query(
        `
          UPDATE projects
          SET updated_by = $1, updated_at = NOW()
          WHERE id = $2
        `,
        [req.user.id, id]
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    const updatedProject = await loadProjects(id);
    res.json({
      message: "Project workflows updated successfully",
      project: updatedProject,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    console.error("Failed to update project workflows:", err);
    res.status(500).json({ error: "Failed to update project workflows" });
  }
});

module.exports = router;
