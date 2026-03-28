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

const resolveReadableTicketId = async (user, ticketRef) => {
  const { clause, params } = await buildProjectAccessFilter(user, "t.project_id", [ticketRef]);
  const { rows } = await db.query(
    `
      SELECT t.id
      FROM tickets t
      WHERE (t.id::text = $1 OR t.ticket_code = $1)
        AND t.deleted_at IS NULL${clause}
      LIMIT 1
    `,
    params
  );

  return rows[0]?.id || null;
};

module.exports = {
  buildProjectAccessFilter,
  resolveReadableTicketId,
};
