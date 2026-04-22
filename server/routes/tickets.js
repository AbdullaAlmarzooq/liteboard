//server/routes/tickets.js

const express = require("express");
const db = require("../db/db"); 
const router = express.Router();
const sanitizeHtml = require("sanitize-html");
const authenticateToken = require("../middleware/authMiddleware"); 
const ensureProjectAccess = require("../middleware/ensureProjectAccess");
const ensureSameWorkgroup = require("../middleware/ensureSameWorkgroup");
const { ensureTicketIsEditable } = require("../middleware/ensureTicketIsEditable");
const { insertEvent, mapEventRow } = require("../utils/events");
const { buildProjectAccessFilter, getProjectAccess } = require("../utils/projectAccess");
const {
  CLOSED_CATEGORY_CODE,
  CANCELLED_CATEGORY_CODE,
  calculateTicketDueDate,
  determineTicketSlaStatus,
} = require("../utils/sla");
const MAX_LIST_PAGE_SIZE = 100;

const parsePagination = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(
    MAX_LIST_PAGE_SIZE,
    Math.max(1, Number.parseInt(query.limit, 10) || 10)
  );
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

const normalizeQueryArray = (value) => {
  if (value === undefined || value === null) return [];

  const rawValues = Array.isArray(value) ? value : [value];
  return [...new Set(
    rawValues
      .flatMap((item) => String(item).split(","))
      .map((item) => item.trim())
      .filter(Boolean)
  )];
};

const normalizeSearchTerm = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const normalizeOptionList = (values) => {
  if (!Array.isArray(values)) return [];

  return [...new Set(
    values
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
};

const buildNullableTextFilter = ({
  column,
  values,
  nullToken,
  clauses,
  params,
  paramIndexRef,
}) => {
  if (!values.length) return;

  const includesNull = values.includes(nullToken);
  const concreteValues = values.filter((value) => value !== nullToken);

  if (includesNull && concreteValues.length) {
    params.push(concreteValues);
    clauses.push(`(${column} = ANY($${paramIndexRef.value}::text[]) OR ${column} IS NULL)`);
    paramIndexRef.value += 1;
    return;
  }

  if (includesNull) {
    clauses.push(`${column} IS NULL`);
    return;
  }

  params.push(concreteValues);
  clauses.push(`${column} = ANY($${paramIndexRef.value}::text[])`);
  paramIndexRef.value += 1;
};

const buildTicketsFilterClause = (query, startIndex = 1) => {
  const clauses = [];
  const params = [];
  const paramIndexRef = { value: startIndex };

  const projectId = typeof query.project_id === "string" ? query.project_id.trim() : "";
  if (projectId) {
    params.push(projectId);
    clauses.push(`t.project_id = $${paramIndexRef.value}`);
    paramIndexRef.value += 1;
  }

  const statusValues = normalizeQueryArray(query.status);
  if (statusValues.length) {
    params.push(statusValues);
    clauses.push(`COALESCE(ws.step_name, t.step_code) = ANY($${paramIndexRef.value}::text[])`);
    paramIndexRef.value += 1;
  }

  const priorityValues = normalizeQueryArray(query.priority);
  if (priorityValues.length) {
    params.push(priorityValues);
    clauses.push(`t.priority = ANY($${paramIndexRef.value}::text[])`);
    paramIndexRef.value += 1;
  }

  const workflowValues = normalizeQueryArray(query.workflow);
  if (workflowValues.length) {
    buildNullableTextFilter({
      column: "wf.name",
      values: workflowValues,
      nullToken: "No Workflow",
      clauses,
      params,
      paramIndexRef,
    });
  }

  const workgroupValues = normalizeQueryArray(query.workgroup);
  if (workgroupValues.length) {
    buildNullableTextFilter({
      column: "w.name",
      values: workgroupValues,
      nullToken: "Unassigned",
      clauses,
      params,
      paramIndexRef,
    });
  }

  const createdByValues = normalizeQueryArray(query.created_by);
  if (createdByValues.length) {
    buildNullableTextFilter({
      column: "creator.name",
      values: createdByValues,
      nullToken: "Unknown",
      clauses,
      params,
      paramIndexRef,
    });
  }

  const responsibleValues = normalizeQueryArray(query.responsible);
  if (responsibleValues.length) {
    buildNullableTextFilter({
      column: "e.name",
      values: responsibleValues,
      nullToken: "Unassigned",
      clauses,
      params,
      paramIndexRef,
    });
  }

  const moduleValues = normalizeQueryArray(query.module);
  if (moduleValues.length) {
    buildNullableTextFilter({
      column: "m.name",
      values: moduleValues,
      nullToken: "No Module",
      clauses,
      params,
      paramIndexRef,
    });
  }

  const tagValues = normalizeQueryArray(query.tag);
  if (tagValues.length) {
    params.push(tagValues);
    clauses.push(`
      EXISTS (
        SELECT 1
        FROM ticket_tags tt_filter
        JOIN tags tg_filter ON tg_filter.id = tt_filter.tag_id
        WHERE tt_filter.ticket_id = t.id
          AND tg_filter.label = ANY($${paramIndexRef.value}::text[])
      )
    `);
    paramIndexRef.value += 1;
  }

  const showOverdue = String(query.showOverdue).toLowerCase() === "true";
  if (showOverdue) {
    clauses.push(`
      COALESCE(wf.sla_enabled, FALSE) = TRUE
      AND
      t.due_date IS NOT NULL
      AND (
        (
          ws.category_code IN (${CLOSED_CATEGORY_CODE}, ${CANCELLED_CATEGORY_CODE})
          AND t.completed_at IS NOT NULL
          AND t.completed_at::date > t.due_date
        )
        OR (
          COALESCE(ws.category_code, 0) NOT IN (${CLOSED_CATEGORY_CODE}, ${CANCELLED_CATEGORY_CODE})
          AND t.completed_at IS NULL
          AND CURRENT_DATE > t.due_date
        )
      )
    `);
  }

  const searchTerm = normalizeSearchTerm(query.q || query.search);
  if (searchTerm) {
    params.push(`%${searchTerm}%`);
    const searchParamIndex = paramIndexRef.value;
    paramIndexRef.value += 1;
    clauses.push(`
      (
        t.ticket_code ILIKE $${searchParamIndex}
        OR t.title ILIKE $${searchParamIndex}
        OR regexp_replace(COALESCE(t.description, ''), '<[^>]*>', '', 'g') ILIKE $${searchParamIndex}
        OR COALESCE(ws.step_name, t.step_code) ILIKE $${searchParamIndex}
        OR COALESCE(t.priority, '') ILIKE $${searchParamIndex}
        OR COALESCE(wf.name, '') ILIKE $${searchParamIndex}
        OR COALESCE(w.name, '') ILIKE $${searchParamIndex}
        OR COALESCE(m.name, '') ILIKE $${searchParamIndex}
        OR COALESCE(e.name, '') ILIKE $${searchParamIndex}
        OR COALESCE(creator.name, '') ILIKE $${searchParamIndex}
        OR EXISTS (
          SELECT 1
          FROM ticket_tags tt_search
          JOIN tags tg_search ON tg_search.id = tt_search.tag_id
          WHERE tt_search.ticket_id = t.id
            AND tg_search.label ILIKE $${searchParamIndex}
        )
      )
    `);
  }

  return {
    clause: clauses.length ? ` AND ${clauses.join(" AND ")}` : "",
    params,
  };
};

const fetchTagsByTicketIds = async (ticketIds) => {
  if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
    return {};
  }

  const tagsQuery = `
    SELECT
      tt.ticket_id,
      tg.id AS tag_id,
      tg.label AS tag_name,
      tg.color AS tag_color
    FROM ticket_tags tt
    JOIN tags tg ON tt.tag_id = tg.id
    WHERE tt.ticket_id = ANY($1::uuid[])
    ORDER BY tt.ticket_id, tg.label
  `;

  const { rows } = await db.query(tagsQuery, [ticketIds]);

  const tagsByTicket = {};
  for (const row of rows) {
    if (!tagsByTicket[row.ticket_id]) {
      tagsByTicket[row.ticket_id] = [];
    }

    tagsByTicket[row.ticket_id].push({
      id: row.tag_id,
      name: row.tag_name,
      color: row.tag_color,
    });
  }

  return tagsByTicket;
};

const normalizeDate = (value) => {
  if (!value) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

const normalizeUuid = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

const normalizeUuidArray = (values) => {
  if (!Array.isArray(values)) return null;

  return [...new Set(
    values
      .map((value) => normalizeUuid(value))
      .filter(Boolean)
  )];
};

const sanitizeTicketDescription = (input) => {
  if (!input) return "";
  return sanitizeHtml(String(input), {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "strike",
      "h1",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "blockquote",
      "pre",
      "code",
      "a",
      "span",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      span: ["style"],
      p: ["style"],
      h1: ["style"],
      h2: ["style"],
      h3: ["style"],
      li: ["style"],
      blockquote: ["style"],
      pre: ["style"],
      code: ["style"],
    },
    allowedStyles: {
      "*": {
        color: [/^#[0-9a-fA-F]{3,8}$/, /^rgb\((\s*\d+\s*,){2}\s*\d+\s*\)$/],
        "background-color": [/^#[0-9a-fA-F]{3,8}$/, /^rgb\((\s*\d+\s*,){2}\s*\d+\s*\)$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
    },
    disallowedTagsMode: "discard",
  });
};

const getTicketByParam = async (id, fields = "*") => {
  const { rows } = await db.query(
    `SELECT ${fields} FROM tickets WHERE (id::text = $1 OR ticket_code = $1) AND deleted_at IS NULL`,
    [id]
  );
  return rows[0];
};

const validateProjectModuleAssignment = async (executor, projectId, moduleId) => {
  if (!projectId || !moduleId) {
    return null;
  }

  const { rows } = await executor.query(
    `
      SELECT m.id, m.name
      FROM project_modules pm
      JOIN modules m ON m.id = pm.module_id
      WHERE pm.project_id = $1
        AND pm.module_id::text = $2
        AND m.deleted_at IS NULL
      LIMIT 1
    `,
    [projectId, moduleId]
  );

  return rows[0] || null;
};

const getTicketEventSnapshot = async (ticketId, executor = db) => {
  const { rows } = await executor.query(
    `
      SELECT
        t.id,
        t.ticket_code,
        t.title,
        t.priority,
        t.module_id,
        m.name AS module_name,
        t.responsible_employee_id,
        e.name AS responsible_employee_name,
        t.workflow_id,
        t.step_code,
        ws.step_name,
        t.start_date,
        t.due_date
      FROM tickets t
      LEFT JOIN modules m ON m.id = t.module_id
      LEFT JOIN employees e ON e.id = t.responsible_employee_id
      LEFT JOIN workflow_steps ws
        ON ws.workflow_id = t.workflow_id
       AND ws.step_code = t.step_code
      WHERE t.id = $1
      LIMIT 1
    `,
    [ticketId]
  );

  return rows[0] || null;
};

const getTicketTagsSnapshot = async (ticketId, executor = db) => {
  const { rows } = await executor.query(
    `
      SELECT
        tg.id,
        tg.label,
        tg.color
      FROM ticket_tags tt
      JOIN tags tg ON tg.id = tt.tag_id
      WHERE tt.ticket_id = $1
      ORDER BY tg.label ASC
    `,
    [ticketId]
  );

  return rows;
};

const resolveTicketSlaStatus = (ticketRow) =>
  determineTicketSlaStatus({
    dueDate: ticketRow?.due_date,
    workflowSlaEnabled: ticketRow?.workflow_sla_enabled,
    stepCategoryCode: ticketRow?.step_category_code,
    completedAt: ticketRow?.completed_at,
  });

// Helper to validate workflow transition
const isValidTransition = async (workflowId, fromStepCode, toStepCode) => {
  const { rows } = await db.query(
    `
      SELECT id FROM workflow_transitions
      WHERE workflow_id = $1 AND from_step_code = $2 AND to_step_code = $3
    `,
    [workflowId, fromStepCode, toStepCode]
  );
  return !!rows[0];
};

// Helper to get allowed next steps for a ticket
const getAllowedNextSteps = async (ticketId) => {
  const ticketResult = await db.query(
    `SELECT workflow_id, step_code FROM tickets WHERE id::text = $1 OR ticket_code = $1`,
    [ticketId]
  );
  const ticket = ticketResult.rows[0];

  if (!ticket) return [];

  const { rows } = await db.query(
    `
      SELECT
        ws.step_code,
        ws.step_name,
        wt.cancel_allowed
      FROM workflow_transitions wt
      JOIN workflow_steps ws
        ON wt.workflow_id = ws.workflow_id AND wt.to_step_code = ws.step_code
      WHERE wt.workflow_id = $1 AND wt.from_step_code = $2
    `,
    [ticket.workflow_id, ticket.step_code]
  );

  return rows;
};

// ----------------------------------------------------------------------
// GET allowed next steps for a ticket (any logged-in user)
// ----------------------------------------------------------------------
// ✅ Fixed: Using authenticateToken() (no roles needed, just authentication)
router.get("/:id/allowed-steps", authenticateToken(), async (req, res) => {
  const { id } = req.params;
  try {
    const allowedSteps = await getAllowedNextSteps(id);
    res.json(allowedSteps);
  } catch (err) {
    console.error("Failed to fetch allowed steps:", err);
    res.status(500).json({ error: "Failed to fetch allowed steps" });
  }
});

// ----------------------------------------------------------------------
// POST update ticket status (workflow transition)
// (Admins + Editors only)
// ----------------------------------------------------------------------
// ✅ Fixed: Using authenticateToken([1, 2]) (Admins and Editors)
router.post(
  "/:id/transition",
  authenticateToken([1, 2]),
  ensureProjectAccess,
  ensureTicketIsEditable({ paramKey: "id" }),
  ensureSameWorkgroup,
  async (req, res) => {
  const { id } = req.params;
  const { step_code } = req.body;

  if (!step_code) {
    return res.status(400).json({ error: "step_code is required" });
  }

  try {
    const currentTicket = await getTicketByParam(id, "id, ticket_code, workflow_id, step_code");

    if (!currentTicket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    if (step_code === currentTicket.step_code) {
      return res.json({ success: true, message: "Already in this step" });
    }

    const isValid = await isValidTransition(
      currentTicket.workflow_id,
      currentTicket.step_code,
      step_code
    );

    if (!isValid) {
      return res.status(400).json({
        error: "Invalid workflow transition",
        message: `Cannot transition from ${currentTicket.step_code} to ${step_code}`,
      });
    }

    const newStepResult = await db.query(
      `
        SELECT step_name, category_code FROM workflow_steps
        WHERE workflow_id = $1 AND step_code = $2
      `,
      [currentTicket.workflow_id, step_code]
    );
    const newStep = newStepResult.rows[0];

    if (!newStep) {
      return res.status(400).json({ error: "Invalid step_code" });
    }

    const currentStepResult = await db.query(
      `
        SELECT step_name
        FROM workflow_steps
        WHERE workflow_id = $1 AND step_code = $2
        LIMIT 1
      `,
      [currentTicket.workflow_id, currentTicket.step_code]
    );
    const currentStep = currentStepResult.rows[0];

    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `
          UPDATE tickets
          SET
            step_code = $1,
            completed_at = CASE WHEN $3 = $4 THEN NOW() ELSE NULL END,
            updated_at = NOW()
          WHERE id = $2
        `,
        [step_code, currentTicket.id, Number(newStep.category_code), CLOSED_CATEGORY_CODE]
      );

      await insertEvent(client, {
        ticketId: currentTicket.id,
        eventType: "ticket.transitioned",
        entityType: "ticket",
        entityId: currentTicket.id,
        actorId: req.user.id,
        actorName: req.user.name,
        payload: {
          workflow_id: currentTicket.workflow_id,
          from_step_code: currentTicket.step_code,
          to_step_code: step_code,
          from_step_name: currentStep?.step_name || currentTicket.step_code,
          to_step_name: newStep.step_name || step_code,
        },
      });

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    const updatedTicketResult = await db.query(
      `
        SELECT t.*, ws.step_name as current_step_name
        FROM tickets t
        LEFT JOIN workflow_steps ws
          ON t.workflow_id = ws.workflow_id AND t.step_code = ws.step_code
        WHERE t.id = $1
      `,
      [currentTicket.id]
    );
    const updatedTicket = updatedTicketResult.rows[0];

    res.json({
      success: true,
      message: `Transitioned to ${newStep.step_name}`,
      ticket: updatedTicket,
    });
  } catch (err) {
    console.error("Failed to transition ticket:", err);
    res.status(500).json({ error: "Failed to transition ticket" });
  }
  }
);

// ----------------------------------------------------------------------
// GET filter options for Tickets page filters (any logged-in user)
// ----------------------------------------------------------------------
router.get("/filter-options", authenticateToken(), async (req, res) => {
  try {
    const { clause: projectAccessClause, params: projectAccessParams } =
      await buildProjectAccessFilter(req.user, "t.project_id");
    const { clause: projectScopeClause, params: projectScopeParams } =
      buildTicketsFilterClause(
        { project_id: req.query.project_id },
        projectAccessParams.length + 1
      );
    const params = [...projectAccessParams, ...projectScopeParams];

    const filterOptionsQuery = `
      SELECT
        array_agg(DISTINCT COALESCE(ws.step_name, t.step_code))
          FILTER (WHERE COALESCE(ws.step_name, t.step_code) IS NOT NULL) AS status,
        array_agg(DISTINCT t.priority)
          FILTER (WHERE t.priority IS NOT NULL) AS priority,
        array_agg(DISTINCT COALESCE(wf.name, 'No Workflow'))
          FILTER (WHERE COALESCE(wf.name, 'No Workflow') IS NOT NULL) AS workflow,
        array_agg(DISTINCT COALESCE(w.name, 'Unassigned'))
          FILTER (WHERE COALESCE(w.name, 'Unassigned') IS NOT NULL) AS workgroup,
        array_agg(DISTINCT COALESCE(creator.name, 'Unknown'))
          FILTER (WHERE COALESCE(creator.name, 'Unknown') IS NOT NULL) AS created_by,
        array_agg(DISTINCT COALESCE(e.name, 'Unassigned'))
          FILTER (WHERE COALESCE(e.name, 'Unassigned') IS NOT NULL) AS responsible,
        array_agg(DISTINCT COALESCE(m.name, 'No Module'))
          FILTER (WHERE COALESCE(m.name, 'No Module') IS NOT NULL) AS module,
        array_agg(DISTINCT tg.label)
          FILTER (WHERE tg.label IS NOT NULL) AS tags
      FROM tickets t
      LEFT JOIN workflows wf ON t.workflow_id = wf.id
      LEFT JOIN workflow_steps ws
        ON ws.workflow_id = t.workflow_id AND ws.step_code = t.step_code
      LEFT JOIN workgroups w ON t.workgroup_id = w.id
      LEFT JOIN modules m ON t.module_id = m.id
      LEFT JOIN employees e ON t.responsible_employee_id = e.id
      LEFT JOIN employees creator ON t.created_by = creator.id
      LEFT JOIN ticket_tags tt ON tt.ticket_id = t.id
      LEFT JOIN tags tg ON tg.id = tt.tag_id
      WHERE t.deleted_at IS NULL${projectAccessClause}${projectScopeClause}
    `;

    const { rows } = await db.query(filterOptionsQuery, params);
    const row = rows[0] || {};

    res.json({
      status: normalizeOptionList(row.status),
      priority: normalizeOptionList(row.priority),
      workflow: normalizeOptionList(row.workflow),
      workGroup: normalizeOptionList(row.workgroup),
      createdBy: normalizeOptionList(row.created_by),
      responsible: normalizeOptionList(row.responsible),
      module: normalizeOptionList(row.module),
      tags: normalizeOptionList(row.tags),
    });
  } catch (err) {
    console.error("Error loading ticket filter options:", err);
    res.status(500).json({ error: "Failed to load ticket filter options" });
  }
});

// ----------------------------------------------------------------------
// GET lightweight tickets list for Tickets page (any logged-in user)
// NOTE: Keeps GET /api/tickets unchanged for backward compatibility.
// ----------------------------------------------------------------------
router.get("/list", authenticateToken(), async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { clause: projectAccessClause, params: projectAccessParams } =
      await buildProjectAccessFilter(req.user, "t.project_id");
    const { clause: filterClause, params: filterParams } = buildTicketsFilterClause(
      req.query,
      projectAccessParams.length + 1
    );
    const params = [...projectAccessParams, ...filterParams];

    const totalQuery = `
      SELECT COUNT(*)::int AS total
      FROM tickets t
      LEFT JOIN workflows wf ON t.workflow_id = wf.id
      LEFT JOIN workflow_steps ws
        ON ws.workflow_id = t.workflow_id AND ws.step_code = t.step_code
      LEFT JOIN workgroups w ON t.workgroup_id = w.id
      LEFT JOIN modules m ON t.module_id = m.id
      LEFT JOIN employees e ON t.responsible_employee_id = e.id
      LEFT JOIN employees creator ON t.created_by = creator.id
      WHERE t.deleted_at IS NULL${projectAccessClause}${filterClause}
    `;
    const { rows: totalRows } = await db.query(totalQuery, params);

    const limitParamIndex = params.length + 1;
    const offsetParamIndex = params.length + 2;
    const ticketsQuery = `
      SELECT
        t.id,
        t.ticket_code,
        t.project_id,
        p.name AS project_name,
        t.title,
        COALESCE(ws.step_name, t.step_code) AS status,
        CASE ws.category_code
          WHEN 10 THEN 'default'
          WHEN 20 THEN 'secondary'
          WHEN 30 THEN 'new'
          WHEN 40 THEN 'destructive'
          ELSE 'outline'
        END AS status_variant,
        ws.category_code AS step_category_code,
        t.priority,
        wf.name AS workflow_name,
        wf.sla_enabled AS workflow_sla_enabled,
        w.name AS workgroup_name,
        m.name AS module_name,
        t.initiate_date,
        t.completed_at,
        t.created_at,
        t.updated_at,
        e.name AS responsible_name,
        creator.name AS created_by_name,
        t.due_date
      FROM tickets t
      LEFT JOIN workflows wf ON t.workflow_id = wf.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN workflow_steps ws
        ON ws.workflow_id = t.workflow_id AND ws.step_code = t.step_code
      LEFT JOIN workgroups w ON t.workgroup_id = w.id
      LEFT JOIN modules m ON t.module_id = m.id
      LEFT JOIN employees e ON t.responsible_employee_id = e.id
      LEFT JOIN employees creator ON t.created_by = creator.id
      WHERE t.deleted_at IS NULL${projectAccessClause}${filterClause}
      ORDER BY t.updated_at DESC NULLS LAST, t.created_at DESC NULLS LAST
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `;

    const { rows: tickets } = await db.query(ticketsQuery, [...params, limit, offset]);
    const tagsByTicket = await fetchTagsByTicketIds(tickets.map((ticket) => ticket.id));

    const lightweightTickets = tickets.map((ticket) => ({
      ...ticket,
      sla_status: resolveTicketSlaStatus(ticket),
      tags: tagsByTicket[ticket.id] || [],
    }));

    res.json({
      items: Array.isArray(lightweightTickets) ? lightweightTickets : [],
      total: totalRows[0]?.total || 0,
      page,
      limit,
    });
  } catch (err) {
    console.error("Error fetching lightweight tickets list:", err);
    res.status(500).json({ error: "Failed to fetch lightweight tickets list" });
  }
});

// ----------------------------------------------------------------------
// GET search results for Tickets page (any logged-in user)
// ----------------------------------------------------------------------
router.get("/search", authenticateToken(), async (req, res) => {
  try {
    const q = normalizeSearchTerm(req.query.q);
    if (!q) {
      return res.json({ items: [] });
    }

    const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 100));
    const { clause: projectAccessClause, params: projectAccessParams } =
      await buildProjectAccessFilter(req.user, "t.project_id");
    const { clause: filterClause, params: filterParams } = buildTicketsFilterClause(
      req.query,
      projectAccessParams.length + 1
    );
    const params = [...projectAccessParams, ...filterParams];
    const limitParamIndex = params.length + 1;

    const searchQuery = `
      SELECT
        t.id,
        t.ticket_code,
        t.title,
        trim(regexp_replace(COALESCE(t.description, ''), '<[^>]*>', '', 'g')) AS description,
        COALESCE(ws.step_name, t.step_code) AS status,
        ws.category_code AS step_category_code,
        t.priority,
        wf.name AS workflow_name,
        wf.sla_enabled AS workflow_sla_enabled,
        w.name AS workgroup_name,
        m.name AS module_name,
        t.initiate_date,
        t.completed_at,
        t.created_at,
        t.updated_at,
        e.name AS responsible_name,
        t.due_date
      FROM tickets t
      LEFT JOIN workflows wf ON t.workflow_id = wf.id
      LEFT JOIN workflow_steps ws
        ON ws.workflow_id = t.workflow_id AND ws.step_code = t.step_code
      LEFT JOIN workgroups w ON t.workgroup_id = w.id
      LEFT JOIN modules m ON t.module_id = m.id
      LEFT JOIN employees e ON t.responsible_employee_id = e.id
      LEFT JOIN employees creator ON t.created_by = creator.id
      WHERE t.deleted_at IS NULL${projectAccessClause}${filterClause}
      ORDER BY t.updated_at DESC NULLS LAST, t.created_at DESC NULLS LAST
      LIMIT $${limitParamIndex}
    `;

    const { rows } = await db.query(searchQuery, [...params, limit]);
    const tagsByTicket = await fetchTagsByTicketIds(rows.map((ticket) => ticket.id));

    const items = rows.map((ticket) => ({
      ...ticket,
      sla_status: resolveTicketSlaStatus(ticket),
      tags: tagsByTicket[ticket.id] || [],
    }));

    res.json({ items });
  } catch (err) {
    console.error("Error searching tickets:", err);
    res.status(500).json({ error: "Failed to search tickets" });
  }
});

// ----------------------------------------------------------------------
// GET export data for Tickets page CSV (any logged-in user)
// ----------------------------------------------------------------------
router.get("/export", authenticateToken(), async (req, res) => {
  try {
    const { clause: projectAccessClause, params: projectAccessParams } =
      await buildProjectAccessFilter(req.user, "t.project_id");
    const { clause: filterClause, params: filterParams } = buildTicketsFilterClause(
      req.query,
      projectAccessParams.length + 1
    );
    const params = [...projectAccessParams, ...filterParams];

    const exportQuery = `
      SELECT
        t.id,
        t.ticket_code,
        p.name AS project_name,
        wf.name AS workflow_name,
        t.title,
        trim(regexp_replace(COALESCE(t.description, ''), '<[^>]*>', '', 'g')) AS description,
        COALESCE(ws.step_name, t.step_code) AS status,
        ws.category_code AS step_category_code,
        t.priority,
        wf.sla_enabled AS workflow_sla_enabled,
        w.name AS workgroup_name,
        e.name AS responsible_name,
        m.name AS module_name,
        t.due_date,
        t.completed_at,
        COALESCE(t.initiate_date, t.created_at) AS created_at
      FROM tickets t
      LEFT JOIN workflows wf ON t.workflow_id = wf.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN workflow_steps ws
        ON ws.workflow_id = t.workflow_id AND ws.step_code = t.step_code
      LEFT JOIN workgroups w ON t.workgroup_id = w.id
      LEFT JOIN modules m ON t.module_id = m.id
      LEFT JOIN employees e ON t.responsible_employee_id = e.id
      LEFT JOIN employees creator ON t.created_by = creator.id
      WHERE t.deleted_at IS NULL${projectAccessClause}${filterClause}
      ORDER BY t.updated_at DESC NULLS LAST, t.created_at DESC NULLS LAST
    `;

    const { rows } = await db.query(exportQuery, params);
    const tagsByTicket = await fetchTagsByTicketIds(rows.map((ticket) => ticket.id));

    const items = rows.map((ticket) => ({
      ...ticket,
      sla_status: resolveTicketSlaStatus(ticket),
      tags: tagsByTicket[ticket.id] || [],
    }));

    res.json({
      items,
      total: items.length,
    });
  } catch (err) {
    console.error("Error loading ticket export data:", err);
    res.status(500).json({ error: "Failed to load ticket export data" });
  }
});

// ----------------------------------------------------------------------
// GET all tickets (any logged-in user)
// ----------------------------------------------------------------------
// ✅ Fixed: Using authenticateToken()
router.get("/", authenticateToken(), async (req, res) => {
  try {
    const { clause: projectAccessClause, params: projectAccessParams } =
      await buildProjectAccessFilter(req.user, "t.project_id");

    const ticketsQuery = `
      SELECT 
        t.id, t.ticket_code, t.title, t.description, t.project_id, p.name AS project_name,
        COALESCE(ws.step_name, t.step_code) AS status, t.step_code, t.priority,
        ws.category_code AS step_category_code,
        t.workflow_id, wf.name AS workflow_name,
        wf.sla_enabled AS workflow_sla_enabled,
        COALESCE(ws.step_name, t.step_code) AS current_step_name,
        CASE ws.category_code
          WHEN 10 THEN 'default'
          WHEN 20 THEN 'secondary'
          WHEN 30 THEN 'new'
          WHEN 40 THEN 'destructive'
          ELSE 'outline'
        END AS status_variant,
        t.workgroup_id, w.name AS workgroup_name,
        t.module_id, m.name AS module_name, t.initiate_date, t.created_at, t.updated_at,
        t.responsible_employee_id, e.name AS responsible_name,
        t.created_by, creator.name AS created_by_name,
        t.due_date, t.start_date, t.completed_at
      FROM tickets t
      LEFT JOIN workflows wf ON t.workflow_id = wf.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN workflow_steps ws
        ON ws.workflow_id = t.workflow_id AND ws.step_code = t.step_code
      LEFT JOIN workgroups w ON t.workgroup_id = w.id
      LEFT JOIN modules m ON t.module_id = m.id
      LEFT JOIN employees e ON t.responsible_employee_id = e.id
      LEFT JOIN employees creator ON t.created_by = creator.id
      WHERE t.deleted_at IS NULL${projectAccessClause}
      ORDER BY t.updated_at DESC NULLS LAST, t.created_at DESC NULLS LAST
    `;
    const { rows: tickets } = await db.query(ticketsQuery, projectAccessParams);

    const tagsQuery = `
      SELECT tt.ticket_id, tg.id as tag_id, tg.label as tag_name, tg.color as tag_color 
      FROM ticket_tags tt 
      JOIN tags tg ON tt.tag_id = tg.id
      JOIN tickets t ON tt.ticket_id = t.id
      WHERE t.deleted_at IS NULL${projectAccessClause}
      ORDER BY tt.ticket_id, tg.label
    `;
    const { rows: allTags } = await db.query(tagsQuery, projectAccessParams);

    const tagsByTicket = {};
    allTags.forEach(tag => {
      if (!tagsByTicket[tag.ticket_id]) {
        tagsByTicket[tag.ticket_id] = [];
      }
      tagsByTicket[tag.ticket_id].push({
        id: tag.tag_id,
        name: tag.tag_name,
        color: tag.tag_color
      });
    });

    const ticketsWithTags = tickets.map(ticket => ({
      ...ticket,
      sla_status: resolveTicketSlaStatus(ticket),
      ticketCode: ticket.ticket_code,
      stepCategoryCode: ticket.step_category_code,
      workGroup: ticket.workgroup_name,
      responsible: ticket.responsible_name,
      createdBy: ticket.created_by_name,
      module: ticket.module_name,
      workflowName: ticket.workflow_name,
      tags: tagsByTicket[ticket.id] || []
    }));

    res.json(Array.isArray(ticketsWithTags) ? ticketsWithTags : []);
  } catch (err) {
    console.error("Error fetching tickets:", err);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

// ----------------------------------------------------------------------
// GET ticket events (any logged-in user with project access)
// ----------------------------------------------------------------------
router.get("/:id/events", authenticateToken(), ensureProjectAccess, async (req, res) => {
  const { id } = req.params;

  try {
    const ticket = await getTicketByParam(id, "id");
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const { rows } = await db.query(
      `
        SELECT
          ev.*,
          t.ticket_code,
          t.title AS ticket_title
        FROM events ev
        LEFT JOIN tickets t ON t.id = ev.ticket_id
        WHERE ev.ticket_id = $1
          AND ev.deleted_at IS NULL
        ORDER BY ev.occurred_at DESC, ev.created_at DESC, ev.id DESC
      `,
      [ticket.id]
    );

    res.json(rows.map(mapEventRow));
  } catch (err) {
    console.error("Error fetching ticket events:", err);
    res.status(500).json({ error: "Failed to fetch ticket events" });
  }
});

// ----------------------------------------------------------------------
// GET single ticket (any logged-in user)
// ----------------------------------------------------------------------
// ✅ Fixed: Using authenticateToken()
router.get("/:id", authenticateToken(), ensureProjectAccess, async (req, res) => {
  const { id } = req.params;
  const includeBlobs = req.query.include_blobs !== "false";

  try {
    const { clause: projectAccessClause, params: projectAccessParams } =
      await buildProjectAccessFilter(req.user, "t.project_id", [id]);

    const ticketQuery = `
      SELECT 
        t.id, t.ticket_code, t.title, t.description, t.project_id, p.name AS project_name, COALESCE(ws.step_name, t.step_code) AS status, t.priority, 
        t.workflow_id,
        wf.sla_enabled AS workflow_sla_enabled,
        t.step_code,
        ws.category_code AS step_category_code,
        COALESCE(ws.step_name, t.step_code) AS current_step_name,
        CASE ws.category_code
          WHEN 10 THEN 'default'
          WHEN 20 THEN 'secondary'
          WHEN 30 THEN 'new'
          WHEN 40 THEN 'destructive'
          ELSE 'outline'
        END AS status_variant,
        t.workgroup_id, w.name AS workgroup_name,
        t.module_id, m.name AS module_name, t.initiate_date, t.created_at,
        t.responsible_employee_id, e.name AS responsible_name,
        t.due_date, t.start_date, t.completed_at,
        t.created_by,
        creator.name AS created_by_name

      FROM tickets t
      LEFT JOIN workflows wf ON t.workflow_id = wf.id
      LEFT JOIN workflow_steps ws
        ON ws.workflow_id = t.workflow_id AND ws.step_code = t.step_code
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN workgroups w ON t.workgroup_id = w.id
      LEFT JOIN modules m ON t.module_id = m.id
      LEFT JOIN employees e ON t.responsible_employee_id = e.id
      LEFT JOIN employees creator ON t.created_by = creator.id

      WHERE (t.id::text = $1 OR t.ticket_code = $1) AND t.deleted_at IS NULL${projectAccessClause}
    `;
    const { rows } = await db.query(ticketQuery, projectAccessParams);
    const ticket = rows[0];

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const tagsQuery = `
      SELECT tt.ticket_id, tg.id as tag_id, tg.label as tag_name, tg.color as tag_color 
      FROM ticket_tags tt 
      JOIN tags tg ON tt.tag_id = tg.id 
      WHERE tt.ticket_id = $1
      ORDER BY tg.label
    `;
    const { rows: tags } = await db.query(tagsQuery, [ticket.id]);

    const commentsResult = await db.query(
      `
        SELECT c.id, c.ticket_id, c.text,
               e.name AS author,
               e.name AS created_by,
               c.author_id,
               c.created_at,
               c.created_at AS timestamp
        FROM comments c
        LEFT JOIN employees e ON c.author_id = e.id
        WHERE c.ticket_id = $1
        ORDER BY c.created_at ASC
      `,
      [ticket.id]
    );
    const comments = commentsResult.rows;

    let attachments = [];
    if (includeBlobs) {
      const attachmentsResult = await db.query(
        `
          SELECT a.id, a.ticket_id, a.filename AS name, a.file_type AS type, a.file_size AS size,
                 ab.base64_data AS data,
                 a.uploaded_at AS created_at, a.uploaded_by AS created_by
          FROM attachments a
          LEFT JOIN attachment_blobs ab ON ab.attachment_id = a.id
          WHERE a.ticket_id = $1
          ORDER BY a.uploaded_at ASC
        `,
        [ticket.id]
      );
      attachments = attachmentsResult.rows;
    } else {
      const attachmentsResult = await db.query(
        `
          SELECT a.id, a.ticket_id, a.filename AS name, a.file_type AS type, a.file_size AS size,
                 a.uploaded_at AS created_at, a.uploaded_by AS created_by,
                 (ab.attachment_id IS NOT NULL) AS has_blob
          FROM attachments a
          LEFT JOIN attachment_blobs ab ON ab.attachment_id = a.id
          WHERE a.ticket_id = $1
          ORDER BY a.uploaded_at ASC
        `,
        [ticket.id]
      );
      attachments = attachmentsResult.rows;
    }

    const fullTicket = {
      ...ticket,
      sla_status: resolveTicketSlaStatus(ticket),
      ticketCode: ticket.ticket_code,
      stepCategoryCode: ticket.step_category_code,
      workGroup: ticket.workgroup_name,
      responsible: ticket.responsible_name,
      module: ticket.module_name,
      created_by: ticket.created_by,
      created_by_name: ticket.created_by_name,
      tags: tags.map(tag => ({
        id: tag.tag_id,
        name: tag.tag_name,
        color: tag.tag_color
      })) || [],
      comments,
      attachments
    };

    res.json(fullTicket);
  } catch (err) {
    console.error("Error fetching ticket:", err);
    res.status(500).json({ error: "Failed to fetch ticket" });
  }
});

// ----------------------------------------------------------------------
// CREATE ticket (Admins + Editors only)
// ----------------------------------------------------------------------

router.post("/", authenticateToken([1, 2]), async (req, res) => {
  const userId = req.user.id;
  const {
    id,
    ticket_code,
    title,
    description,
    project_id,
    step_code,
    priority,
    workflow_id,
    workgroup_id,
    module_id,
    responsible_employee_id,
    start_date,
    tag_ids,
  } = req.body;

  if (!project_id) {
    return res.status(400).json({ error: "project_id is required" });
  }

  if (!workflow_id) {
    return res.status(400).json({ error: "workflow_id is required" });
  }

  if (!step_code) {
    return res.status(400).json({ error: "step_code is required" });
  }

  try {
    const safeDescription = sanitizeTicketDescription(description);
    const now = new Date();
    const bahrainTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bahrain" }));
    const timestamp = bahrainTime.toISOString();
    const normalizedStartDate = normalizeDate(start_date);
    const startDateForInsert = normalizedStartDate || timestamp.slice(0, 10);
    const code = id || ticket_code || `TCK-${Date.now()}`;
    let completedAt = null;
    const normalizedTagIds = normalizeUuidArray(tag_ids || []);
    const normalizedModuleId = normalizeUuid(module_id);

    if (tag_ids !== undefined && normalizedTagIds === null) {
      return res.status(400).json({ error: "tag_ids must be an array of tag IDs" });
    }

    const projectAccess = await getProjectAccess(req.user, project_id, {
      requireActiveForNonAdmin: true,
    });
    if (projectAccess.status !== 200) {
      return res.status(projectAccess.status).json({ error: projectAccess.message });
    }

    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");
      let selectedTags = [];

      const workflowResult = await client.query(
        `
          SELECT w.id
          FROM workflows w
          JOIN project_workflows pw ON pw.workflow_id = w.id
          WHERE w.id = $1
            AND pw.project_id = $2
          LIMIT 1
        `,
        [workflow_id, project_id]
      );
      if (!workflowResult.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "Selected workflow does not belong to the selected project.",
        });
      }

      const stepResult = await client.query(
        `
          SELECT step_code, step_name, workgroup_id, category_code
          FROM workflow_steps
          WHERE workflow_id = $1 AND step_code = $2
          LIMIT 1
        `,
        [workflow_id, step_code]
      );
      const stepInfo = stepResult.rows[0];
      if (!stepInfo) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Invalid workflow step selected." });
      }

      const resolvedWorkgroupId = stepInfo.workgroup_id || null;
      if (normalizeUuid(workgroup_id) && normalizeUuid(workgroup_id) !== resolvedWorkgroupId) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "Selected workflow step does not match the assigned workgroup.",
        });
      }

      if (normalizedModuleId) {
        const selectedModule = await validateProjectModuleAssignment(
          client,
          project_id,
          normalizedModuleId
        );

        if (!selectedModule) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            error: "Selected module does not belong to the selected project.",
          });
        }
      }

      if (normalizedTagIds && normalizedTagIds.length > 0) {
        const tagsResult = await client.query(
          `
            SELECT id, label, color
            FROM tags
            WHERE id = ANY($1::uuid[])
              AND project_id = $2
              AND deleted_at IS NULL
          `,
          [normalizedTagIds, project_id]
        );

        if (tagsResult.rows.length !== normalizedTagIds.length) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            error: "One or more selected tags do not belong to the selected project.",
          });
        }

        selectedTags = tagsResult.rows;
      }

      const stepCategory = Number(stepInfo.category_code);
      if (stepCategory === CLOSED_CATEGORY_CODE) {
        completedAt = timestamp;
      }

      const calculatedDueDate = await calculateTicketDueDate(
        timestamp,
        workflow_id,
        client
      );

      const insertResult = await client.query(
        `
          INSERT INTO tickets
            (ticket_code, title, description, project_id, step_code, priority, workflow_id, workgroup_id,
             module_id, responsible_employee_id, due_date, start_date, initiate_date, completed_at, created_at, updated_at, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          RETURNING id, ticket_code
        `,
        [
          code,
          title,
          safeDescription,
          project_id,
          step_code,
          priority,
          workflow_id,
          resolvedWorkgroupId,
          normalizedModuleId,
          responsible_employee_id,
          normalizeDate(calculatedDueDate),
          startDateForInsert,
          timestamp,
          completedAt,
          timestamp,
          timestamp,
          userId,
        ]
      );

      const ticketId = insertResult.rows[0].id;

      if (normalizedTagIds && normalizedTagIds.length > 0) {
        for (const tag_id of normalizedTagIds) {
          await client.query(
            `INSERT INTO ticket_tags (ticket_id, tag_id, created_at) VALUES ($1, $2, NOW())`,
            [ticketId, tag_id]
          );
        }
      }

      await insertEvent(client, {
        ticketId,
        eventType: "ticket.created",
        entityType: "ticket",
        entityId: ticketId,
        actorId: req.user.id,
        actorName: req.user.name,
        payload: {
          ticket_code: insertResult.rows[0].ticket_code,
        },
        occurredAt: timestamp,
      });

      for (const tag of selectedTags) {
        await insertEvent(client, {
          ticketId,
          eventType: "tag.added",
          entityType: "tag",
          entityId: tag.id,
          actorId: req.user.id,
          actorName: req.user.name,
          payload: {
            tag_label: tag.label,
            tag_color: tag.color,
          },
          occurredAt: timestamp,
        });
      }

      await client.query("COMMIT");
      res.status(201).json({ message: "Ticket created", id: ticketId, ticket_code: insertResult.rows[0].ticket_code });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Ticket code already exists" });
    }
    console.error("Error creating ticket:", err);
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

// ----------------------------------------------------------------------
// UPDATE ticket (Admins + Editors only), must be same workgroup unless Admin)
// ----------------------------------------------------------------------

router.put(
  "/:id",
  authenticateToken([1, 2]),
  ensureProjectAccess,
  ensureTicketIsEditable({ paramKey: "id" }),
  ensureSameWorkgroup,
  async (req, res) => {
  const { id } = req.params;

  const { 
    title, description, priority,
    workflowId, workgroupId, moduleId,
    responsibleEmployeeId, startDate, tags, stepCode
  } = req.body;

  let step_code = stepCode || null;

  try {
    const safeDescription =
      description !== undefined ? sanitizeTicketDescription(description) : undefined;
    const ticket = await getTicketByParam(
      id,
      "id, workflow_id, project_id, created_by, title, description, due_date, initiate_date, created_at"
    );
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const canEditTitleAndDescription =
      !!ticket.created_by && String(ticket.created_by) === String(req.user.id);
    const nextTitle = title !== undefined ? title : ticket.title;
    const nextDescription =
      safeDescription !== undefined ? safeDescription : ticket.description;
    const normalizedCurrentTitle = ticket.title ?? "";
    const normalizedNextTitle = nextTitle ?? "";
    const normalizedCurrentDescription = sanitizeTicketDescription(ticket.description ?? "");
    const normalizedNextDescription = sanitizeTicketDescription(nextDescription ?? "");

    if (!canEditTitleAndDescription) {
      const isTitleChanged =
        title !== undefined && normalizedNextTitle !== normalizedCurrentTitle;
      const isDescriptionChanged =
        description !== undefined &&
        normalizedNextDescription !== normalizedCurrentDescription;

      if (isTitleChanged || isDescriptionChanged) {
        return res.status(403).json({
          error:
            "Only the ticket creator can edit title and description. Legacy tickets without a creator cannot edit these fields.",
        });
      }
    }

    const normalizedTagIds = normalizeUuidArray(
      Array.isArray(tags) ? tags.map((tag) => tag?.id ?? tag) : []
    );
    if (tags !== undefined && normalizedTagIds === null) {
      return res.status(400).json({ error: "tags must be an array of tag IDs" });
    }

    const effectiveWorkflowId = workflowId || ticket.workflow_id;
    const normalizedEffectiveWorkflowId = normalizeUuid(effectiveWorkflowId);
    const shouldRecalculateDueDate =
      workflowId !== undefined &&
      String(normalizedEffectiveWorkflowId || "") !== String(ticket.workflow_id || "");
    let stepInfo = null;
    if (step_code && normalizedEffectiveWorkflowId) {
      const stepResult = await db.query(
        `
          SELECT step_name, category_code
          FROM workflow_steps
          WHERE workflow_id = $1 AND step_code = $2
        `,
        [normalizedEffectiveWorkflowId, step_code]
      );
      stepInfo = stepResult.rows[0];
      if (!stepInfo) {
        return res.status(400).json({ error: "Invalid workflow step selected." });
      }
    }

    const now = new Date();
    const bahrainTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bahrain" }));
    const timestamp = bahrainTime.toISOString();

    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");
      const beforeSnapshot = await getTicketEventSnapshot(ticket.id, client);
      const beforeTags = await getTicketTagsSnapshot(ticket.id, client);
      let selectedTags = [];
      const recalculatedDueDate = shouldRecalculateDueDate
        ? await calculateTicketDueDate(
            ticket.initiate_date || ticket.created_at,
            normalizedEffectiveWorkflowId,
            client
          )
        : ticket.due_date;
      const effectiveModuleId =
        moduleId === undefined
          ? normalizeUuid(beforeSnapshot?.module_id)
          : normalizeUuid(moduleId);

      if (effectiveModuleId) {
        const selectedModule = await validateProjectModuleAssignment(
          client,
          ticket.project_id,
          effectiveModuleId
        );

        if (!selectedModule) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            error: "Selected module does not belong to this ticket's project.",
          });
        }
      }

      if (normalizedTagIds && normalizedTagIds.length > 0) {
        const tagValidationResult = await client.query(
          `
            SELECT id, label, color
            FROM tags
            WHERE id = ANY($1::uuid[])
              AND project_id = $2
              AND deleted_at IS NULL
          `,
          [normalizedTagIds, ticket.project_id]
        );

        if (tagValidationResult.rows.length !== normalizedTagIds.length) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            error: "One or more selected tags do not belong to this ticket's project.",
          });
        }

        selectedTags = tagValidationResult.rows;
      }

      await client.query(
        `
          UPDATE tickets
          SET
            title = $1,
            description = $2,
            priority = $3,
            workflow_id = $4,
            workgroup_id = $5,
            module_id = $6,
            responsible_employee_id = $7,
            due_date = $8,
            start_date = $9,
            step_code = COALESCE($10, step_code),
            updated_at = $11,
            completed_at = CASE
              WHEN $10 IS NULL THEN completed_at
              WHEN $13 = $14 THEN NOW()
              ELSE NULL
            END
          WHERE id = $12
        `,
        [
          nextTitle,
          nextDescription,
          priority,
          normalizedEffectiveWorkflowId,
          normalizeUuid(workgroupId),
          effectiveModuleId,
          normalizeUuid(responsibleEmployeeId),
          normalizeDate(recalculatedDueDate),
          normalizeDate(startDate),
          step_code,
          timestamp,
          ticket.id,
          Number(stepInfo?.category_code),
          CLOSED_CATEGORY_CODE,
        ]
      );

      await client.query(`DELETE FROM ticket_tags WHERE ticket_id = $1`, [ticket.id]);
      if (normalizedTagIds && normalizedTagIds.length > 0) {
        for (const tagId of normalizedTagIds) {
          await client.query(
            `INSERT INTO ticket_tags (ticket_id, tag_id, created_at) VALUES ($1, $2, NOW())`,
            [ticket.id, tagId]
          );
        }
      }

      const afterSnapshot = await getTicketEventSnapshot(ticket.id, client);
      const updateChanges = [];

      if (beforeSnapshot?.title !== afterSnapshot?.title) {
        updateChanges.push({
          field: "title",
          old_value: beforeSnapshot?.title ?? null,
          new_value: afterSnapshot?.title ?? null,
        });
      }

      if (beforeSnapshot?.priority !== afterSnapshot?.priority) {
        updateChanges.push({
          field: "priority",
          old_value: beforeSnapshot?.priority ?? null,
          new_value: afterSnapshot?.priority ?? null,
        });
      }

      if (String(beforeSnapshot?.module_id || "") !== String(afterSnapshot?.module_id || "")) {
        updateChanges.push({
          field: "module_id",
          old_value: beforeSnapshot?.module_id ?? null,
          new_value: afterSnapshot?.module_id ?? null,
          old_name: beforeSnapshot?.module_name ?? null,
          new_name: afterSnapshot?.module_name ?? null,
        });
      }

      if (String(beforeSnapshot?.start_date || "") !== String(afterSnapshot?.start_date || "")) {
        updateChanges.push({
          field: "start_date",
          old_value: beforeSnapshot?.start_date ?? null,
          new_value: afterSnapshot?.start_date ?? null,
        });
      }

      if (String(beforeSnapshot?.due_date || "") !== String(afterSnapshot?.due_date || "")) {
        updateChanges.push({
          field: "due_date",
          old_value: beforeSnapshot?.due_date ?? null,
          new_value: afterSnapshot?.due_date ?? null,
        });
      }

      if (updateChanges.length > 0) {
        await insertEvent(client, {
          ticketId: ticket.id,
          eventType: "ticket.updated",
          entityType: "ticket",
          entityId: ticket.id,
          actorId: req.user.id,
          actorName: req.user.name,
          payload: {
            changes: updateChanges,
          },
          occurredAt: timestamp,
        });
      }

      if (
        String(beforeSnapshot?.responsible_employee_id || "") !==
        String(afterSnapshot?.responsible_employee_id || "")
      ) {
        await insertEvent(client, {
          ticketId: ticket.id,
          eventType: "ticket.assigned",
          entityType: "ticket",
          entityId: ticket.id,
          actorId: req.user.id,
          actorName: req.user.name,
          payload: {
            old_responsible_employee_id: beforeSnapshot?.responsible_employee_id ?? null,
            new_responsible_employee_id: afterSnapshot?.responsible_employee_id ?? null,
            old_responsible_employee_name: beforeSnapshot?.responsible_employee_name ?? null,
            new_responsible_employee_name: afterSnapshot?.responsible_employee_name ?? null,
          },
          occurredAt: timestamp,
        });
      }

      if (String(beforeSnapshot?.step_code || "") !== String(afterSnapshot?.step_code || "")) {
        await insertEvent(client, {
          ticketId: ticket.id,
          eventType: "ticket.transitioned",
          entityType: "ticket",
          entityId: ticket.id,
          actorId: req.user.id,
          actorName: req.user.name,
          payload: {
            workflow_id: afterSnapshot?.workflow_id ?? effectiveWorkflowId ?? null,
            from_step_code: beforeSnapshot?.step_code ?? null,
            to_step_code: afterSnapshot?.step_code ?? null,
            from_step_name: beforeSnapshot?.step_name ?? beforeSnapshot?.step_code ?? null,
            to_step_name: afterSnapshot?.step_name ?? afterSnapshot?.step_code ?? null,
          },
          occurredAt: timestamp,
        });
      }

      const beforeTagsById = new Map(beforeTags.map((tag) => [String(tag.id), tag]));
      const afterTagsById = new Map(selectedTags.map((tag) => [String(tag.id), tag]));

      for (const [tagId, tag] of afterTagsById.entries()) {
        if (!beforeTagsById.has(tagId)) {
          await insertEvent(client, {
            ticketId: ticket.id,
            eventType: "tag.added",
            entityType: "tag",
            entityId: tag.id,
            actorId: req.user.id,
            actorName: req.user.name,
            payload: {
              tag_label: tag.label,
              tag_color: tag.color,
            },
            occurredAt: timestamp,
          });
        }
      }

      for (const [tagId, tag] of beforeTagsById.entries()) {
        if (!afterTagsById.has(tagId)) {
          await insertEvent(client, {
            ticketId: ticket.id,
            eventType: "tag.removed",
            entityType: "tag",
            entityId: tag.id,
            actorId: req.user.id,
            actorName: req.user.name,
            payload: {
              tag_label: tag.label,
              tag_color: tag.color,
            },
            occurredAt: timestamp,
          });
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    res.json({
      message: "Ticket updated successfully",
      step_code,
      status: stepInfo ? stepInfo.step_name : undefined,
    });

  } catch (err) {
    console.error("Error updating ticket:", err);
    if (err.message === "Ticket not found") {
      return res.status(404).json({ error: "Ticket not found" });
    }
    res.status(500).json({ error: "Failed to update ticket" });
  }
  }
);

// ----------------------------------------------------------------------
// DELETE ticket (Admins only)
// ----------------------------------------------------------------------
// ✅ Fixed: Using authenticateToken([1]) (Admins only)
router.delete(
  "/:id",
  authenticateToken([1]),
  ensureProjectAccess,
  ensureTicketIsEditable({ paramKey: "id" }),
  async (req, res) => {
  const { id } = req.params;

  try {
    const ticket = await getTicketByParam(id, "id");
    if (!ticket) throw new Error("Ticket not found");

    await db.query(
      "UPDATE tickets SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1",
      [ticket.id]
    );
    res.json({ message: "Ticket deleted successfully" });
  } catch (err) {
    console.error("Error deleting ticket:", err);
    if (err.message === "Ticket not found") {
      return res.status(404).json({ error: "Ticket not found" });
    }
    res.status(500).json({ error: "Failed to delete ticket" });
  }
  }
);

module.exports = router;
