// server/features/profile/profile.service.js

const bcrypt = require("bcryptjs");
const db = require("../../db/db");
const { mapEventRow } = require("../../utils/events");
const { buildProjectAccessFilter } = require("../../utils/projectAccess");

class ProfileServiceError extends Error {
  constructor(status, body, code = "PROFILE_SERVICE_ERROR") {
    const normalizedBody = typeof body === "string" ? { error: body } : body;
    super(normalizedBody?.error || "Profile service error");
    this.name = "ProfileServiceError";
    this.status = status;
    this.code = code;
    this.body = normalizedBody || { error: this.message };
  }
}

const createServiceError = (status, body, code) =>
  new ProfileServiceError(status, body, code);

const isProfileServiceError = (error) => error instanceof ProfileServiceError;

const parsePagination = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const getActivity = async ({ user, query }) => {
  const userId = user.id;
  const { page, limit, offset } = parsePagination(query);

  const { clause: projectAccessClause, params: projectAccessParams } =
    await buildProjectAccessFilter(user, "t.project_id", [userId]);
  const limitParamIndex = projectAccessParams.length + 1;
  const offsetParamIndex = projectAccessParams.length + 2;

  const totalSql = `
      SELECT COUNT(*)::int AS total
      FROM events ev
      LEFT JOIN tickets t ON ev.ticket_id = t.id
      WHERE ev.actor_id = $1
        AND ev.deleted_at IS NULL${projectAccessClause}
    `;

  const sql = `
      SELECT 
        ev.*,
        t.ticket_code,
        t.title AS ticket_title
      FROM events ev
      LEFT JOIN tickets t ON ev.ticket_id = t.id
      WHERE ev.actor_id = $1
        AND ev.deleted_at IS NULL${projectAccessClause}
      ORDER BY ev.occurred_at DESC, ev.created_at DESC, ev.id DESC
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `;

  const [{ rows: totalRows }, { rows }] = await Promise.all([
    db.query(totalSql, projectAccessParams),
    db.query(sql, [...projectAccessParams, limit, offset]),
  ]);

  return {
    items: rows.map(mapEventRow),
    total: totalRows[0]?.total || 0,
    page,
    limit,
  };
};

const getGlobalActivity = async ({ query }) => {
  const { page, limit, offset } = parsePagination(query);

  const totalSql = `
      SELECT COUNT(*)::int AS total
      FROM events ev
      WHERE ev.deleted_at IS NULL
    `;

  const sql = `
      SELECT
        ev.*,
        t.ticket_code,
        t.title AS ticket_title
      FROM events ev
      LEFT JOIN tickets t ON ev.ticket_id = t.id
      WHERE ev.deleted_at IS NULL
      ORDER BY ev.occurred_at DESC, ev.created_at DESC, ev.id DESC
      LIMIT $1 OFFSET $2
    `;

  const [{ rows: totalRows }, { rows }] = await Promise.all([
    db.query(totalSql),
    db.query(sql, [limit, offset]),
  ]);

  return {
    items: rows.map(mapEventRow),
    total: totalRows[0]?.total || 0,
    page,
    limit,
  };
};

const updateMyPassword = async ({ user, body }) => {
  const userId = user.id;
  const { current_password, new_password } = body;

  if (!current_password || !new_password) {
    throw createServiceError(
      400,
      { error: "Both fields are required" },
      "VALIDATION_ERROR"
    );
  }

  const userResult = await db.query(
    "SELECT id, password_hash FROM employees WHERE id = $1",
    [userId]
  );
  const profileUser = userResult.rows[0];

  if (!profileUser) {
    throw createServiceError(404, { error: "User not found" }, "NOT_FOUND");
  }

  const isMatch = bcrypt.compareSync(current_password, profileUser.password_hash);
  if (!isMatch) {
    throw createServiceError(
      401,
      { error: "Current password is incorrect" },
      "INVALID_CURRENT_PASSWORD"
    );
  }

  const salt = bcrypt.genSaltSync(10);
  const newHash = bcrypt.hashSync(new_password, salt);

  await db.query(
    "UPDATE employees SET password_hash = $1 WHERE id = $2",
    [newHash, userId]
  );

  return { message: "Password updated successfully" };
};

const getMyTickets = async ({ user, query: requestQuery }) => {
  const userId = user.id;
  const { page, limit, offset } = parsePagination(requestQuery);

  const employeeResult = await db.query(
    "SELECT workgroup_id FROM employees WHERE id = $1",
    [userId]
  );
  const employee = employeeResult.rows[0];

  if (!employee || !employee.workgroup_id) {
    throw createServiceError(
      404,
      { error: "User workgroup not found." },
      "NOT_FOUND"
    );
  }

  const workgroupId = employee.workgroup_id;
  const { clause: projectAccessClause, params: projectAccessParams } =
    await buildProjectAccessFilter(user, "t.project_id", [workgroupId]);
  const limitParamIndex = projectAccessParams.length + 1;
  const offsetParamIndex = projectAccessParams.length + 2;

  const totalQuery = `
      SELECT COUNT(*)::int AS total
      FROM tickets t
      LEFT JOIN workflow_steps ws
        ON t.workflow_id = ws.workflow_id AND t.step_code = ws.step_code
      WHERE
        t.workgroup_id = $1
        AND t.deleted_at IS NULL
        AND ws.category_code IN (10, 20)${projectAccessClause}
    `;

  const ticketsQuery = `
      SELECT
        t.id,
        t.ticket_code,
        t.ticket_code AS ticketCode,
        t.title,
        COALESCE(ws.step_name, t.step_code) AS status,
        t.step_code,
        COALESCE(ws.step_name, t.step_code) AS current_step_name,
        t.priority,
        t.created_by,
        e.name AS created_by_name,
        t.responsible_employee_id,
        r.name AS responsible_name,
        t.workgroup_id,
        w.name AS workgroup_name,
        t.module_id,
        m.name AS module_name,
        t.due_date,
        t.start_date,
        t.updated_at,
        ws.category_code
      FROM tickets t
      LEFT JOIN employees e ON t.created_by = e.id
      LEFT JOIN employees r ON t.responsible_employee_id = r.id
      LEFT JOIN workgroups w ON t.workgroup_id = w.id
      LEFT JOIN modules m ON t.module_id = m.id
      LEFT JOIN workflow_steps ws
        ON t.workflow_id = ws.workflow_id AND t.step_code = ws.step_code
      WHERE
        t.workgroup_id = $1
        AND t.deleted_at IS NULL
        AND ws.category_code IN (10, 20)${projectAccessClause}
      ORDER BY t.updated_at DESC
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `;

  const [{ rows: totalRows }, { rows: tickets }] = await Promise.all([
    db.query(totalQuery, projectAccessParams),
    db.query(ticketsQuery, [...projectAccessParams, limit, offset]),
  ]);

  return {
    items: tickets,
    total: totalRows[0]?.total || 0,
    page,
    limit,
  };
};

const getOverview = async ({ user }) => {
  const userId = user.id;

  const query = `
      WITH profile_user AS (
        SELECT
          e.id,
          e.name,
          e.email,
          e.role_id,
          e.workgroup_id,
          r.name AS role_name,
          wg.name AS workgroup_name,
          wg.ticket_code AS workgroup_code
        FROM employees e
        LEFT JOIN roles r ON r.id = e.role_id
        LEFT JOIN workgroups wg ON wg.id = e.workgroup_id
        WHERE e.id = $1
          AND e.deleted_at IS NULL
        LIMIT 1
      ),
      accessible_tickets AS (
        SELECT
          t.created_by,
          t.responsible_employee_id,
          t.workgroup_id,
          COALESCE(wf.name, t.workflow_id::text, 'Unknown') AS workflow,
          COALESCE(ws.step_name, t.step_code, 'Unknown') AS step_name,
          ws.category_code
        FROM tickets t
        CROSS JOIN profile_user cu
        LEFT JOIN workflows wf ON wf.id = t.workflow_id
        LEFT JOIN workflow_steps ws
          ON ws.workflow_id = t.workflow_id AND ws.step_code = t.step_code
        WHERE t.deleted_at IS NULL
          AND (
            cu.role_id = 1 OR (
              cu.workgroup_code IS NOT NULL AND EXISTS (
                SELECT 1
                FROM project_workgroups pwg
                WHERE pwg.project_id = t.project_id
                  AND pwg.workgroup_code = cu.workgroup_code
              )
            )
          )
      ),
      assigned_workflows AS (
        SELECT
          at.workflow,
          COUNT(*)::int AS count
        FROM accessible_tickets at
        CROSS JOIN profile_user cu
        WHERE at.responsible_employee_id = cu.id
          AND at.category_code IN (10, 20)
        GROUP BY at.workflow
      ),
      workgroup_statuses AS (
        SELECT
          at.step_name AS name,
          COUNT(*)::int AS value
        FROM accessible_tickets at
        CROSS JOIN profile_user cu
        WHERE cu.workgroup_id IS NOT NULL
          AND at.workgroup_id = cu.workgroup_id
          AND at.category_code IN (10, 20)
        GROUP BY at.step_name
      )
      SELECT
        cu.id,
        cu.name,
        cu.email,
        cu.role_id,
        cu.role_name,
        cu.workgroup_id,
        cu.workgroup_name,
        COALESCE(
          (SELECT COUNT(*)::int FROM accessible_tickets at WHERE at.created_by = cu.id),
          0
        ) AS raised_by_me,
        COALESCE(
          (SELECT SUM(aw.count)::int FROM assigned_workflows aw),
          0
        ) AS assigned_to_me,
        COALESCE(
          (SELECT SUM(ws.value)::int FROM workgroup_statuses ws),
          0
        ) AS workgroup_tickets,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object('workflow', aw.workflow, 'count', aw.count)
              ORDER BY aw.count DESC, aw.workflow ASC
            )
            FROM assigned_workflows aw
          ),
          '[]'::json
        ) AS assigned_workflows,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object('name', ws.name, 'value', ws.value)
              ORDER BY ws.value DESC, ws.name ASC
            )
            FROM workgroup_statuses ws
          ),
          '[]'::json
        ) AS workgroup_statuses
      FROM profile_user cu
    `;

  const { rows } = await db.query(query, [userId]);
  const overview = rows[0];

  if (!overview) {
    throw createServiceError(
      404,
      { error: "User not found." },
      "NOT_FOUND"
    );
  }

  return {
    user: {
      id: overview.id,
      name: overview.name,
      email: overview.email,
      role_id: overview.role_id,
      role_name: overview.role_name,
      workgroup_id: overview.workgroup_id,
      workgroup_name: overview.workgroup_name,
    },
    raised_by_me: Number(overview.raised_by_me) || 0,
    assigned_to_me: Number(overview.assigned_to_me) || 0,
    workgroup_tickets: Number(overview.workgroup_tickets) || 0,
    assigned_workflows: Array.isArray(overview.assigned_workflows)
      ? overview.assigned_workflows.map((item) => ({
          workflow: item.workflow,
          count: Number(item.count) || 0,
        }))
      : [],
    workgroup_statuses: Array.isArray(overview.workgroup_statuses)
      ? overview.workgroup_statuses.map((item) => ({
          name: item.name,
          value: Number(item.value) || 0,
        }))
      : [],
  };
};

const getStats = async ({ user }) => {
  const userId = user.id;

  const { clause: projectAccessClause, params: projectAccessParams } =
    await buildProjectAccessFilter(user, "t.project_id", [userId]);

  const raisedByMeResult = await db.query(
    `
        SELECT COUNT(*) AS count
        FROM tickets t
        WHERE t.created_by = $1
          AND t.deleted_at IS NULL${projectAccessClause}
      `,
    projectAccessParams
  );
  const assignedToMeResult = await db.query(
    `
        SELECT COUNT(*) AS count
        FROM tickets t
        JOIN workflow_steps ws
          ON ws.workflow_id = t.workflow_id AND ws.step_code = t.step_code
        WHERE t.responsible_employee_id = $1
        AND t.deleted_at IS NULL
        AND ws.category_code != 90
      `,
    projectAccessParams
  );
  const workgroupTicketsResult = await db.query(
    `
        SELECT COUNT(*) AS count
        FROM tickets t
        JOIN workflow_steps ws
          ON ws.workflow_id = t.workflow_id AND ws.step_code = t.step_code
        WHERE t.workgroup_id = (
          SELECT workgroup_id FROM employees WHERE id = $1
        )
        AND t.deleted_at IS NULL
        AND ws.category_code != 90
      `,
    projectAccessParams
  );

  return {
    raised_by_me: raisedByMeResult.rows[0]?.count || 0,
    assigned_to_me: assignedToMeResult.rows[0]?.count || 0,
    workgroup_tickets: workgroupTicketsResult.rows[0]?.count || 0,
  };
};

module.exports = {
  ProfileServiceError,
  isProfileServiceError,
  getActivity,
  getGlobalActivity,
  updateMyPassword,
  getMyTickets,
  getOverview,
  getStats,
};
