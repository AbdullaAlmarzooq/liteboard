const express = require("express");
const router = express.Router();
const authenticateToken = require("../../middleware/authMiddleware");
const db = require("../../db/db");

router.get("/overview", authenticateToken(), async (req, res) => {
  const userId = req.user.id;

  try {
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
      return res.status(404).json({ error: "User not found." });
    }

    res.json({
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
    });
  } catch (err) {
    console.error("Error fetching profile overview:", err);
    res.status(500).json({ error: "Failed to fetch profile overview" });
  }
});

module.exports = router;
