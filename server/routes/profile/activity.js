const express = require("express");
const router = express.Router();
const db = require("../../db/db");
const authenticateToken = require("../../middleware/authMiddleware");
const { mapEventRow } = require("../../utils/events");
const { buildProjectAccessFilter } = require("../../utils/projectAccess");

const parsePagination = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

router.get("/activity", authenticateToken(), async (req, res) => {
  const userId = req.user.id;
  const { page, limit, offset } = parsePagination(req.query);

  try {
    const { clause: projectAccessClause, params: projectAccessParams } =
      await buildProjectAccessFilter(req.user, "t.project_id", [userId]);
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

    res.json({
      items: rows.map(mapEventRow),
      total: totalRows[0]?.total || 0,
      page,
      limit,
    });
  } catch (err) {
    console.error("Error fetching user activity:", err);
    res.status(500).json({ error: "Failed to fetch recent activity" });
  }
});

module.exports = router;
