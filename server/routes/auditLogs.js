const express = require("express");
const db = require("../db/db");
const authenticateToken = require("../middleware/authMiddleware");
const { mapEventRow } = require("../utils/events");

const router = express.Router();

const MAX_AUDIT_LOG_LIMIT = 100;
const DEFAULT_AUDIT_LOG_LIMIT = 10;

const SORT_COLUMNS = {
  occurred_at: "ev.occurred_at",
  event_type: "ev.event_type",
  entity_type: "ev.entity_type",
  actor_name: "ev.actor_name",
  action: "action",
};

const parsePagination = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(
    MAX_AUDIT_LOG_LIMIT,
    Math.max(1, Number.parseInt(query.limit, 10) || DEFAULT_AUDIT_LOG_LIMIT)
  );
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

const normalizeText = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const normalizeDateBoundary = (value, boundary) => {
  const rawValue = normalizeText(value);
  if (!rawValue) return null;

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(rawValue);
  const date = isDateOnly
    ? new Date(`${rawValue}T00:00:00.000Z`)
    : new Date(rawValue);

  if (Number.isNaN(date.getTime())) return null;

  if (isDateOnly && boundary === "end") {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return date.toISOString();
};

const buildAuditLogFilters = (query, startIndex = 1) => {
  const clauses = ["ev.deleted_at IS NULL"];
  const params = [];
  let paramIndex = startIndex;

  const search = normalizeText(query.search);
  if (search) {
    params.push(`%${search}%`);
    clauses.push(`(
      ev.event_type ILIKE $${paramIndex}
      OR ev.entity_type ILIKE $${paramIndex}
      OR ev.entity_id ILIKE $${paramIndex}
      OR COALESCE(ev.actor_name, '') ILIKE $${paramIndex}
      OR COALESCE(ev.payload->>'message', '') ILIKE $${paramIndex}
      OR COALESCE(ev.payload->>'entity_name', '') ILIKE $${paramIndex}
      OR COALESCE(ev.payload->>'ticket_code', '') ILIKE $${paramIndex}
      OR COALESCE(t.ticket_code, '') ILIKE $${paramIndex}
    )`);
    paramIndex += 1;
  }

  const actorId = normalizeText(query.actor_id);
  if (actorId) {
    params.push(actorId);
    clauses.push(`ev.actor_id::text = $${paramIndex}`);
    paramIndex += 1;
  }

  const entityType = normalizeText(query.entity_type);
  if (entityType) {
    params.push(entityType);
    clauses.push(`ev.entity_type = $${paramIndex}`);
    paramIndex += 1;
  }

  const eventType = normalizeText(query.event_type);
  if (eventType) {
    params.push(eventType);
    clauses.push(`ev.event_type = $${paramIndex}`);
    paramIndex += 1;
  }

  const action = normalizeText(query.action);
  if (action) {
    params.push(action);
    clauses.push(`COALESCE(NULLIF(ev.payload->>'action', ''), regexp_replace(ev.event_type, '^.*\\.', '')) = $${paramIndex}`);
    paramIndex += 1;
  }

  const dateFrom = normalizeDateBoundary(query.date_from, "start");
  if (dateFrom) {
    params.push(dateFrom);
    clauses.push(`ev.occurred_at >= $${paramIndex}::timestamptz`);
    paramIndex += 1;
  }

  const dateTo = normalizeDateBoundary(query.date_to, "end");
  if (dateTo) {
    params.push(dateTo);
    clauses.push(`ev.occurred_at < $${paramIndex}::timestamptz`);
    paramIndex += 1;
  }

  return {
    whereClause: clauses.length ? `WHERE ${clauses.join("\n        AND ")}` : "",
    params,
  };
};

const resolveSort = (query) => {
  const requestedSort = normalizeText(query.sort) || "occurred_at";
  const sortColumn = SORT_COLUMNS[requestedSort] || SORT_COLUMNS.occurred_at;
  const direction = normalizeText(query.direction).toLowerCase() === "asc" ? "ASC" : "DESC";

  return `${sortColumn} ${direction} NULLS LAST, ev.created_at DESC, ev.id DESC`;
};

const mapAuditLogRow = (row) => {
  const event = mapEventRow(row);

  return {
    ...event,
    action: row.action || event.payload?.action || null,
    details: Array.isArray(event.detail_lines) ? event.detail_lines : [],
  };
};

router.get("/filters", authenticateToken([1]), async (_req, res) => {
  try {
    const [actorsResult, entityTypesResult, eventTypesResult, actionsResult] = await Promise.all([
      db.query(`
        SELECT id, name
        FROM (
          SELECT DISTINCT ON (ev.actor_id)
            ev.actor_id::text AS id,
            COALESCE(NULLIF(ev.actor_name, ''), 'Unknown actor') AS name,
            ev.occurred_at
          FROM events ev
          WHERE ev.deleted_at IS NULL
            AND ev.actor_id IS NOT NULL
          ORDER BY ev.actor_id, ev.occurred_at DESC
        ) actors
        ORDER BY name ASC
        LIMIT 500
      `),
      db.query(`
        SELECT DISTINCT ev.entity_type AS value
        FROM events ev
        WHERE ev.deleted_at IS NULL
        ORDER BY ev.entity_type ASC
      `),
      db.query(`
        SELECT DISTINCT ev.event_type AS value
        FROM events ev
        WHERE ev.deleted_at IS NULL
        ORDER BY ev.event_type ASC
      `),
      db.query(`
        SELECT DISTINCT COALESCE(NULLIF(ev.payload->>'action', ''), regexp_replace(ev.event_type, '^.*\\.', '')) AS value
        FROM events ev
        WHERE ev.deleted_at IS NULL
        ORDER BY value ASC
      `),
    ]);

    res.json({
      actors: actorsResult.rows,
      entityTypes: entityTypesResult.rows.map((row) => row.value).filter(Boolean),
      eventTypes: eventTypesResult.rows.map((row) => row.value).filter(Boolean),
      actions: actionsResult.rows.map((row) => row.value).filter(Boolean),
    });
  } catch (err) {
    console.error("Error loading audit log filters:", err);
    res.status(500).json({ error: "Failed to load audit log filters" });
  }
});

router.get("/", authenticateToken([1]), async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const { whereClause, params } = buildAuditLogFilters(req.query);
  const orderBy = resolveSort(req.query);

  try {
    const fromClause = `
      FROM events ev
      LEFT JOIN tickets t ON ev.ticket_id = t.id
    `;
    const totalSql = `
      SELECT COUNT(*)::int AS total
      ${fromClause}
      ${whereClause}
    `;
    const limitParamIndex = params.length + 1;
    const offsetParamIndex = params.length + 2;
    const itemsSql = `
      SELECT
        ev.*,
        t.ticket_code,
        t.title AS ticket_title,
        COALESCE(NULLIF(ev.payload->>'action', ''), regexp_replace(ev.event_type, '^.*\\.', '')) AS action
      ${fromClause}
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `;

    const [{ rows: totalRows }, { rows }] = await Promise.all([
      db.query(totalSql, params),
      db.query(itemsSql, [...params, limit, offset]),
    ]);

    const total = totalRows[0]?.total || 0;

    res.json({
      items: rows.map(mapAuditLogRow),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Error fetching audit logs:", err);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

module.exports = router;
