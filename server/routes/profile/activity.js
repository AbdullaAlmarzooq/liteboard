const express = require("express");
const router = express.Router();
const db = require("../../db/db");
const authenticateToken = require("../../middleware/authMiddleware");
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

    const totalSql = `
      SELECT COUNT(*)::int AS total
      FROM status_history sh
      LEFT JOIN tickets t ON sh.ticket_id = t.id
      WHERE sh.changed_by = $1${projectAccessClause}
    `;

    const sql = `
      SELECT 
        sh.id,
        t.ticket_code AS ticket_id,
        t.id AS ticket_uuid,
        t.title AS ticket_title,
        t.ticket_code,
        sh.activity_type,
        sh.field_name,
        sh.new_value,
        sh.created_at AS timestamp,
        e.name AS changed_by_name,
        sh.changed_by
      FROM status_history sh
      LEFT JOIN tickets t ON sh.ticket_id = t.id
      LEFT JOIN employees e ON sh.changed_by = e.id
      WHERE sh.changed_by = $1${projectAccessClause}
      ORDER BY sh.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const [{ rows: totalRows }, { rows }] = await Promise.all([
      db.query(totalSql, projectAccessParams),
      db.query(sql, [...projectAccessParams, limit, offset]),
    ]);

    res.json({
      items: rows,
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
