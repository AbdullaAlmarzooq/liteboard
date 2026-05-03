// server/features/projects/projects.service.js

const db = require("../../db/db");
const { buildProjectAccessFilter } = require("../../utils/projectAccess");
const { buildAdminChangePayload, createAdminEvent } = require("../../utils/events");

class ProjectsServiceError extends Error {
  constructor(status, body, code = "PROJECTS_SERVICE_ERROR") {
    const normalizedBody = typeof body === "string" ? { error: body } : body;
    super(normalizedBody?.error || "Projects service error");
    this.name = "ProjectsServiceError";
    this.status = status;
    this.code = code;
    this.body = normalizedBody || { error: this.message };
  }
}

const createServiceError = (status, body, code) =>
  new ProjectsServiceError(status, body, code);

const isProjectsServiceError = (error) => error instanceof ProjectsServiceError;

const getAdminEventActor = (user) => ({
  id: user?.id || null,
  name: user?.name || null,
});

const getProjectSnapshotForEvents = (project) => {
  if (!project) return null;

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    active: project.active,
    workgroup_codes: (project.workgroups || []).map((workgroup) => workgroup.code).sort(),
    workflow_ids: (project.workflows || []).map((workflow) => workflow.id).sort(),
    module_ids: (project.modules || []).map((module) => module.id).sort(),
  };
};

const logProjectUpdateEvents = async (client, user, beforeProject, afterProject, fields) => {
  const beforeSnapshot = getProjectSnapshotForEvents(beforeProject);
  const afterSnapshot = getProjectSnapshotForEvents(afterProject);
  const { changes, before, after } = buildAdminChangePayload(beforeSnapshot, afterSnapshot, {
    fields,
    fieldLabels: {
      name: "Name",
      description: "Description",
      active: "Active",
      workgroup_codes: "Workgroups",
      workflow_ids: "Workflows",
      module_ids: "Modules",
    },
  });

  const nonActiveChanges = changes.filter((change) => change.field !== "active");
  if (nonActiveChanges.length > 0) {
    await createAdminEvent(client, {
      actor: getAdminEventActor(user),
      entity: "project",
      action: "updated",
      entityId: afterSnapshot.id,
      entityName: afterSnapshot.name,
      changes: nonActiveChanges,
      before,
      after,
    });
  }

  const activeChange = changes.find((change) => change.field === "active");
  if (activeChange) {
    await createAdminEvent(client, {
      actor: getAdminEventActor(user),
      entity: "project",
      action: afterSnapshot.active ? "activated" : "deactivated",
      entityId: afterSnapshot.id,
      entityName: afterSnapshot.name,
      changes: [activeChange],
      before,
      after,
    });
  }
};

const hydrateProjectAssignments = async (projects) => {
  const projectIds = projects.map((project) => project.id);
  if (!projectIds.length) {
    return [];
  }

  const projectMap = new Map(
    projects.map((row) => [
      row.id,
      {
        ...row,
        workgroups: [],
        workflows: [],
        modules: [],
      },
    ])
  );

  const [workgroupsResult, workflowsResult, modulesResult] = await Promise.all([
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
    db.query(
      `
        SELECT
          pm.project_id,
          pm.module_id,
          pm.created_by,
          pm.created_at,
          m.name,
          m.description,
          m.active
        FROM project_modules pm
        LEFT JOIN modules m ON m.id = pm.module_id
        WHERE pm.project_id = ANY($1::text[])
        ORDER BY pm.project_id, m.name ASC NULLS LAST, pm.module_id ASC
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

  for (const row of modulesResult.rows) {
    const project = projectMap.get(row.project_id);
    if (!project) continue;

    project.modules.push({
      id: row.module_id,
      name: row.name,
      description: row.description,
      active: row.active,
      assigned_at: row.created_at,
      assigned_by: row.created_by,
    });
  }

  return projects.map((row) => projectMap.get(row.id));
};

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

  return hydrateProjectAssignments(rows);
};

const getProjectDashboard = async ({ user }) => {
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

  return rows;
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
        COALESCE(wf_counts.workflow_count, 0)::int AS workflow_count,
        COALESCE(mod_counts.module_count, 0)::int AS module_count
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
      LEFT JOIN (
        SELECT project_id, COUNT(*)::int AS module_count
        FROM project_modules
        GROUP BY project_id
      ) mod_counts
        ON mod_counts.project_id = p.id
      ORDER BY p.active DESC, p.name ASC, p.id ASC
    `
  );

  return rows;
};

const normalizeBoolean = (value, fallback) => {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
};

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);

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
    throw createServiceError(
      400,
      { error: `${fieldName} must include at least one selection` },
      "VALIDATION_ERROR"
    );
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
    modules: [],
  }));

  if (!projects.length) {
    return projectId ? null : [];
  }

  const hydratedProjects = await hydrateProjectAssignments(projects);
  return projectId ? hydratedProjects[0] : hydratedProjects;
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
    throw createServiceError(
      400,
      { error: `Unknown workgroup code(s): ${missingCodes.join(", ")}` },
      "VALIDATION_ERROR"
    );
  }
};

const validateWorkflowIds = async (workflowIds) => {
  if (!workflowIds.length) {
    return;
  }

  const invalidIds = workflowIds.filter((id) => !isUuid(id));
  if (invalidIds.length) {
    throw createServiceError(
      400,
      { error: `Invalid workflow id(s): ${invalidIds.join(", ")}` },
      "VALIDATION_ERROR"
    );
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
    throw createServiceError(
      400,
      { error: `Unknown workflow id(s): ${missingIds.join(", ")}` },
      "VALIDATION_ERROR"
    );
  }
};

const validateModuleIds = async (moduleIds) => {
  if (!moduleIds.length) {
    return;
  }

  const invalidIds = moduleIds.filter((id) => !isUuid(id));
  if (invalidIds.length) {
    throw createServiceError(
      400,
      { error: `Invalid module id(s): ${invalidIds.join(", ")}` },
      "VALIDATION_ERROR"
    );
  }

  const { rows } = await db.query(
    `
      SELECT id
      FROM modules
      WHERE id = ANY($1::uuid[])
    `,
    [moduleIds]
  );

  const existingIds = new Set(rows.map((row) => row.id));
  const missingIds = moduleIds.filter((id) => !existingIds.has(id));

  if (missingIds.length) {
    throw createServiceError(
      400,
      { error: `Unknown module id(s): ${missingIds.join(", ")}` },
      "VALIDATION_ERROR"
    );
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

const replaceProjectModules = async (client, projectId, moduleIds, actorId) => {
  await client.query(
    `
      DELETE FROM project_modules
      WHERE project_id = $1
    `,
    [projectId]
  );

  for (const moduleId of moduleIds) {
    await client.query(
      `
        INSERT INTO project_modules (project_id, module_id, created_by)
        VALUES ($1, $2, $3)
      `,
      [projectId, moduleId, actorId]
    );
  }
};

const getProjectById = async ({ id }) => {
  const project = await loadProjects(id);
  if (!project) {
    throw createServiceError(404, { error: "Project not found" }, "NOT_FOUND");
  }

  return project;
};

const createProject = async ({ body, user }) => {
  const {
    id,
    name,
    description,
    active,
    workgroupCodes: rawWorkgroupCodes = [],
    workflowIds: rawWorkflowIds = [],
    moduleIds: rawModuleIds = [],
  } = body;

  if (!name || !String(name).trim()) {
    throw createServiceError(
      400,
      { error: "Project name is required" },
      "VALIDATION_ERROR"
    );
  }

  const workgroupCodes = normalizeStringArray(rawWorkgroupCodes);
  if (workgroupCodes === null) {
    throw createServiceError(
      400,
      { error: "workgroupCodes must be an array of workgroup codes" },
      "VALIDATION_ERROR"
    );
  }

  const workflowIds = normalizeStringArray(rawWorkflowIds);
  if (workflowIds === null) {
    throw createServiceError(
      400,
      { error: "workflowIds must be an array of workflow IDs" },
      "VALIDATION_ERROR"
    );
  }

  const moduleIds = normalizeStringArray(rawModuleIds);
  if (moduleIds === null) {
    throw createServiceError(
      400,
      { error: "moduleIds must be an array of module IDs" },
      "VALIDATION_ERROR"
    );
  }

  const projectId = id && String(id).trim() ? String(id).trim() : await generateProjectId();
  const actorId = user.id;
  const activeValue = normalizeBoolean(active, true);

  ensureNonEmptyAssignments(workgroupCodes, "workgroupCodes");
  ensureNonEmptyAssignments(workflowIds, "workflowIds");
  await validateWorkgroupCodes(workgroupCodes);
  await validateWorkflowIds(workflowIds);
  await validateModuleIds(moduleIds);

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
    await replaceProjectModules(client, projectId, moduleIds, actorId);

    await createAdminEvent(client, {
      actor: getAdminEventActor(user),
      entity: "project",
      action: "created",
      entityId: projectId,
      entityName: String(name).trim(),
      after: {
        id: projectId,
        name: String(name).trim(),
        description: description || null,
        active: activeValue,
        workgroup_codes: workgroupCodes,
        workflow_ids: workflowIds,
        module_ids: moduleIds,
      },
    });

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      throw createServiceError(
        409,
        { error: "Project ID already exists" },
        "DUPLICATE_PROJECT"
      );
    }
    throw err;
  } finally {
    client.release();
  }

  const project = await loadProjects(projectId);
  return {
    message: "Project created successfully",
    project,
  };
};

const updateProject = async ({ id, body, user }) => {
  const {
    name,
    description,
    active,
    workgroupCodes: rawWorkgroupCodes,
    workflowIds: rawWorkflowIds,
    moduleIds: rawModuleIds,
  } = body;

  if (!name || !String(name).trim()) {
    throw createServiceError(
      400,
      { error: "Project name is required" },
      "VALIDATION_ERROR"
    );
  }

  const beforeProject = await loadProjects(id);
  if (!beforeProject) {
    throw createServiceError(404, { error: "Project not found" }, "NOT_FOUND");
  }

  const workgroupCodes =
    rawWorkgroupCodes === undefined ? null : normalizeStringArray(rawWorkgroupCodes);
  if (rawWorkgroupCodes !== undefined && workgroupCodes === null) {
    throw createServiceError(
      400,
      { error: "workgroupCodes must be an array of workgroup codes" },
      "VALIDATION_ERROR"
    );
  }

  const workflowIds =
    rawWorkflowIds === undefined ? null : normalizeStringArray(rawWorkflowIds);
  if (rawWorkflowIds !== undefined && workflowIds === null) {
    throw createServiceError(
      400,
      { error: "workflowIds must be an array of workflow IDs" },
      "VALIDATION_ERROR"
    );
  }

  const moduleIds =
    rawModuleIds === undefined ? null : normalizeStringArray(rawModuleIds);
  if (rawModuleIds !== undefined && moduleIds === null) {
    throw createServiceError(
      400,
      { error: "moduleIds must be an array of module IDs" },
      "VALIDATION_ERROR"
    );
  }

  if (workgroupCodes !== null) {
    ensureNonEmptyAssignments(workgroupCodes, "workgroupCodes");
    await validateWorkgroupCodes(workgroupCodes);
  }

  if (workflowIds !== null) {
    ensureNonEmptyAssignments(workflowIds, "workflowIds");
    await validateWorkflowIds(workflowIds);
  }

  if (moduleIds !== null) {
    await validateModuleIds(moduleIds);
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
        user.id,
        id,
      ]
    );

    if (workgroupCodes !== null) {
      await replaceProjectWorkgroups(client, id, workgroupCodes, user.id);
    }

    if (workflowIds !== null) {
      await replaceProjectWorkflows(client, id, workflowIds, user.id);
    }

    if (moduleIds !== null) {
      await replaceProjectModules(client, id, moduleIds, user.id);
    }

    const afterProject = {
      ...beforeProject,
      name: String(name).trim(),
      description: description || null,
      active:
        normalizeBoolean(active, null) === null
          ? beforeProject.active
          : normalizeBoolean(active, null),
      workgroups: workgroupCodes === null
        ? beforeProject.workgroups
        : workgroupCodes.map((code) => ({ code })),
      workflows: workflowIds === null
        ? beforeProject.workflows
        : workflowIds.map((workflowId) => ({ id: workflowId })),
      modules: moduleIds === null
        ? beforeProject.modules
        : moduleIds.map((moduleId) => ({ id: moduleId })),
    };

    await logProjectUpdateEvents(client, user, beforeProject, afterProject, [
      "name",
      "description",
      "active",
      "workgroup_codes",
      "workflow_ids",
      "module_ids",
    ]);

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const project = await loadProjects(id);
  return {
    message: "Project updated successfully",
    project,
  };
};

const updateProjectWorkgroups = async ({ id, body, user }) => {
  const workgroupCodes = normalizeStringArray(body.workgroupCodes);

  if (workgroupCodes === null) {
    throw createServiceError(
      400,
      { error: "workgroupCodes must be an array of workgroup codes" },
      "VALIDATION_ERROR"
    );
  }

  const project = await loadProjects(id);
  if (!project) {
    throw createServiceError(404, { error: "Project not found" }, "NOT_FOUND");
  }

  ensureNonEmptyAssignments(workgroupCodes, "workgroupCodes");
  await validateWorkgroupCodes(workgroupCodes);

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    await replaceProjectWorkgroups(client, id, workgroupCodes, user.id);
    await client.query(
      `
          UPDATE projects
          SET updated_by = $1, updated_at = NOW()
          WHERE id = $2
        `,
      [user.id, id]
    );
    await logProjectUpdateEvents(
      client,
      user,
      project,
      {
        ...project,
        workgroups: workgroupCodes.map((code) => ({ code })),
      },
      ["workgroup_codes"]
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const updatedProject = await loadProjects(id);
  return {
    message: "Project workgroups updated successfully",
    project: updatedProject,
  };
};

const updateProjectWorkflows = async ({ id, body, user }) => {
  const workflowIds = normalizeStringArray(body.workflowIds);

  if (workflowIds === null) {
    throw createServiceError(
      400,
      { error: "workflowIds must be an array of workflow IDs" },
      "VALIDATION_ERROR"
    );
  }

  const project = await loadProjects(id);
  if (!project) {
    throw createServiceError(404, { error: "Project not found" }, "NOT_FOUND");
  }

  ensureNonEmptyAssignments(workflowIds, "workflowIds");
  await validateWorkflowIds(workflowIds);

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    await replaceProjectWorkflows(client, id, workflowIds, user.id);
    await client.query(
      `
          UPDATE projects
          SET updated_by = $1, updated_at = NOW()
          WHERE id = $2
        `,
      [user.id, id]
    );
    await logProjectUpdateEvents(
      client,
      user,
      project,
      {
        ...project,
        workflows: workflowIds.map((workflowId) => ({ id: workflowId })),
      },
      ["workflow_ids"]
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const updatedProject = await loadProjects(id);
  return {
    message: "Project workflows updated successfully",
    project: updatedProject,
  };
};

const updateProjectModules = async ({ id, body, user }) => {
  const moduleIds = normalizeStringArray(body.moduleIds);

  if (moduleIds === null) {
    throw createServiceError(
      400,
      { error: "moduleIds must be an array of module IDs" },
      "VALIDATION_ERROR"
    );
  }

  const project = await loadProjects(id);
  if (!project) {
    throw createServiceError(404, { error: "Project not found" }, "NOT_FOUND");
  }

  await validateModuleIds(moduleIds);

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    await replaceProjectModules(client, id, moduleIds, user.id);
    await client.query(
      `
          UPDATE projects
          SET updated_by = $1, updated_at = NOW()
          WHERE id = $2
        `,
      [user.id, id]
    );
    await logProjectUpdateEvents(
      client,
      user,
      project,
      {
        ...project,
        modules: moduleIds.map((moduleId) => ({ id: moduleId })),
      },
      ["module_ids"]
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const updatedProject = await loadProjects(id);
  return {
    message: "Project modules updated successfully",
    project: updatedProject,
  };
};

module.exports = {
  ProjectsServiceError,
  isProjectsServiceError,
  listReadableProjects,
  getProjectDashboard,
  listProjectSummaries,
  getProjectById,
  createProject,
  updateProject,
  updateProjectWorkgroups,
  updateProjectWorkflows,
  updateProjectModules,
};
