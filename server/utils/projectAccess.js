const db = require("../db/db");

const ADMIN_ROLE_ID = 1;

const getUserWorkgroupCode = async (userId) => {
  const { rows } = await db.query(
    `
      SELECT wg.ticket_code AS workgroup_code
      FROM employees e
      LEFT JOIN workgroups wg ON e.workgroup_id = wg.id
      WHERE e.id = $1
        AND e.deleted_at IS NULL
      LIMIT 1
    `,
    [userId]
  );

  return rows[0]?.workgroup_code || null;
};

const getProjectAccess = async (user, projectId, options = {}) => {
  const { requireActiveForNonAdmin = false } = options;

  if (!projectId) {
    return {
      project: null,
      workgroupCode: null,
      status: 400,
      message: "Project is required.",
    };
  }

  const { rows: projectRows } = await db.query(
    `
      SELECT id, name, description, active, created_at, updated_at
      FROM projects
      WHERE id = $1
      LIMIT 1
    `,
    [projectId]
  );

  const project = projectRows[0];
  if (!project) {
    return {
      project: null,
      workgroupCode: null,
      status: 404,
      message: "Project not found.",
    };
  }

  if (Number(user?.role_id) === ADMIN_ROLE_ID) {
    return {
      project,
      workgroupCode: null,
      status: 200,
      message: null,
    };
  }

  if (!user?.id) {
    return {
      project,
      workgroupCode: null,
      status: 401,
      message: "Unauthorized: user not found in token",
    };
  }

  if (requireActiveForNonAdmin && !project.active) {
    return {
      project,
      workgroupCode: null,
      status: 403,
      message: "This project is inactive.",
    };
  }

  const workgroupCode = await getUserWorkgroupCode(user.id);
  if (!workgroupCode) {
    return {
      project,
      workgroupCode: null,
      status: 403,
      message: "You do not have access to the selected project.",
    };
  }

  const { rows: accessRows } = await db.query(
    `
      SELECT 1
      FROM project_workgroups
      WHERE project_id = $1
        AND workgroup_code = $2
      LIMIT 1
    `,
    [projectId, workgroupCode]
  );

  if (!accessRows[0]) {
    return {
      project,
      workgroupCode,
      status: 403,
      message: "You do not have access to the selected project.",
    };
  }

  return {
    project,
    workgroupCode,
    status: 200,
    message: null,
  };
};

const buildProjectAccessFilter = async (user, projectColumn, params = []) => {
  if (Number(user?.role_id) === ADMIN_ROLE_ID) {
    return { clause: "", params };
  }

  if (!user?.id) {
    return { clause: "\n        AND 1 = 0", params };
  }

  const workgroupCode = await getUserWorkgroupCode(user.id);
  if (!workgroupCode) {
    return { clause: "\n        AND 1 = 0", params };
  }

  const paramIndex = params.length + 1;

  return {
    clause: `
        AND EXISTS (
          SELECT 1
          FROM project_workgroups pwg
          WHERE pwg.project_id = ${projectColumn}
            AND pwg.workgroup_code = $${paramIndex}
        )`,
    params: [...params, workgroupCode],
  };
};

const getReadableTicketAccess = async (user, ticketRef) => {
  if (!user?.id) {
    return {
      ticketId: null,
      status: 401,
      message: "Unauthorized: user not found in token",
    };
  }

  const { rows: ticketRows } = await db.query(
    `
      SELECT t.id
      FROM tickets t
      WHERE (t.id::text = $1 OR t.ticket_code = $1)
        AND t.deleted_at IS NULL
      LIMIT 1
    `,
    [ticketRef]
  );

  const ticket = ticketRows[0];
  if (!ticket) {
    return {
      ticketId: null,
      status: 404,
      message: "Ticket not found",
    };
  }

  if (Number(user?.role_id) === ADMIN_ROLE_ID) {
    return {
      ticketId: ticket.id,
      status: 200,
      message: null,
    };
  }

  const workgroupCode = await getUserWorkgroupCode(user.id);
  if (!workgroupCode) {
    return {
      ticketId: null,
      status: 403,
      message: "You do not have access to this ticket.",
    };
  }

  const { rows: accessRows } = await db.query(
    `
      SELECT 1
      FROM tickets t
      JOIN project_workgroups pwg ON pwg.project_id = t.project_id
      WHERE t.id = $1
        AND pwg.workgroup_code = $2
      LIMIT 1
    `,
    [ticket.id, workgroupCode]
  );

  if (!accessRows[0]) {
    return {
      ticketId: null,
      status: 403,
      message: "You do not have access to this ticket.",
    };
  }

  return {
    ticketId: ticket.id,
    status: 200,
    message: null,
  };
};

const resolveReadableTicketId = async (user, ticketRef) => {
  const access = await getReadableTicketAccess(user, ticketRef);
  return access.ticketId || null;
};

module.exports = {
  buildProjectAccessFilter,
  getProjectAccess,
  getReadableTicketAccess,
  getUserWorkgroupCode,
  resolveReadableTicketId,
};
