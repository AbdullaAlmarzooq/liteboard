//server/routes/tickets.js

const express = require("express");
const db = require("../db/db"); 
const router = express.Router();
const sanitizeHtml = require("sanitize-html");
const authenticateToken = require("../middleware/authMiddleware"); 
const ensureSameWorkgroup = require("../middleware/ensureSameWorkgroup");

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
router.post("/:id/transition", authenticateToken([1, 2]), ensureSameWorkgroup, async (req, res) => {
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
        SELECT step_name FROM workflow_steps
        WHERE workflow_id = $1 AND step_code = $2
      `,
      [currentTicket.workflow_id, step_code]
    );
    const newStep = newStepResult.rows[0];

    if (!newStep) {
      return res.status(400).json({ error: "Invalid step_code" });
    }

    await db.query(
      `
        UPDATE tickets
        SET step_code = $1, updated_at = NOW()
        WHERE id = $2
      `,
      [step_code, currentTicket.id]
    );

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
});

// ----------------------------------------------------------------------
// GET all tickets (any logged-in user)
// ----------------------------------------------------------------------
// ✅ Fixed: Using authenticateToken()
router.get("/", authenticateToken(), async (req, res) => {
  try {
    const ticketsQuery = `
      SELECT 
        t.id, t.ticket_code, t.title, t.description, COALESCE(ws.step_name, t.step_code) AS status, t.step_code, t.priority, 
        t.workflow_id, wf.name AS workflow_name,
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
        t.due_date, t.start_date 
      FROM tickets t
      LEFT JOIN workflows wf ON t.workflow_id = wf.id
      LEFT JOIN workflow_steps ws
        ON ws.workflow_id = t.workflow_id AND ws.step_code = t.step_code
      LEFT JOIN workgroups w ON t.workgroup_id = w.id
      LEFT JOIN modules m ON t.module_id = m.id
      LEFT JOIN employees e ON t.responsible_employee_id = e.id
      LEFT JOIN employees creator ON t.created_by = creator.id
      WHERE t.deleted_at IS NULL
      ORDER BY t.updated_at DESC NULLS LAST, t.created_at DESC NULLS LAST
    `;
    const { rows: tickets } = await db.query(ticketsQuery);

    const tagsQuery = `
      SELECT tt.ticket_id, tg.id as tag_id, tg.label as tag_name, tg.color as tag_color 
      FROM ticket_tags tt 
      JOIN tags tg ON tt.tag_id = tg.id 
      ORDER BY tt.ticket_id, tg.label
    `;
    const { rows: allTags } = await db.query(tagsQuery);

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
      ticketCode: ticket.ticket_code,
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
// GET single ticket (any logged-in user)
// ----------------------------------------------------------------------
// ✅ Fixed: Using authenticateToken()
router.get("/:id", authenticateToken(), async (req, res) => {
  const { id } = req.params;
  const includeBlobs = req.query.include_blobs !== "false";

  try {
    const ticketQuery = `
      SELECT 
        t.id, t.ticket_code, t.title, t.description, COALESCE(ws.step_name, t.step_code) AS status, t.priority, 
        t.workflow_id,
        t.step_code,
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
        t.due_date, t.start_date,
        t.created_by,
        creator.name AS created_by_name

      FROM tickets t
      LEFT JOIN workflow_steps ws
        ON ws.workflow_id = t.workflow_id AND ws.step_code = t.step_code
      LEFT JOIN workgroups w ON t.workgroup_id = w.id
      LEFT JOIN modules m ON t.module_id = m.id
      LEFT JOIN employees e ON t.responsible_employee_id = e.id
      LEFT JOIN employees creator ON t.created_by = creator.id

      WHERE (t.id::text = $1 OR t.ticket_code = $1) AND t.deleted_at IS NULL
    `;
    const { rows } = await db.query(ticketQuery, [id]);
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
      ticketCode: ticket.ticket_code,
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
  const { id, ticket_code, title, description, step_code, priority, workflow_id, workgroup_id, module_id, responsible_employee_id, due_date, start_date, tag_ids } = req.body;

  try {
    const safeDescription = sanitizeTicketDescription(description);
    const now = new Date();
    const bahrainTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bahrain" }));
    const timestamp = bahrainTime.toISOString();
    const code = id || ticket_code || `TCK-${Date.now()}`;

    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");

      const insertResult = await client.query(
        `
          INSERT INTO tickets
            (ticket_code, title, description, step_code, priority, workflow_id, workgroup_id,
             module_id, responsible_employee_id, due_date, start_date, initiate_date, created_at, updated_at, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING id, ticket_code
        `,
        [
          code,
          title,
          safeDescription,
          step_code,
          priority,
          workflow_id,
          workgroup_id,
          module_id,
          responsible_employee_id,
          normalizeDate(due_date),
          normalizeDate(start_date),
          timestamp,
          timestamp,
          timestamp,
          userId,
        ]
      );

      const ticketId = insertResult.rows[0].id;

      if (tag_ids && Array.isArray(tag_ids)) {
        for (const tag_id of tag_ids) {
          await client.query(
            `INSERT INTO ticket_tags (ticket_id, tag_id, created_at) VALUES ($1, $2, NOW())`,
            [ticketId, tag_id]
          );
        }
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

router.put("/:id", authenticateToken([1, 2]), ensureSameWorkgroup, async (req, res) => {
  const { id } = req.params;

  const { 
    title, description, priority,
    workflowId, workgroupId, moduleId,
    responsibleEmployeeId, dueDate, startDate, tags, stepCode
  } = req.body;

  let step_code = stepCode || null;

  try {
    const safeDescription = sanitizeTicketDescription(description);
    const ticket = await getTicketByParam(id, "id, workflow_id");
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const effectiveWorkflowId = workflowId || ticket.workflow_id;
    let stepInfo = null;
    if (step_code && effectiveWorkflowId) {
      const stepResult = await db.query(
        `
          SELECT step_name
          FROM workflow_steps
          WHERE workflow_id = $1 AND step_code = $2
        `,
        [effectiveWorkflowId, step_code]
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
            updated_at = $11
          WHERE id = $12
        `,
        [
          title,
          safeDescription,
          priority,
          normalizeUuid(effectiveWorkflowId),
          normalizeUuid(workgroupId),
          normalizeUuid(moduleId),
          normalizeUuid(responsibleEmployeeId),
          normalizeDate(dueDate),
          normalizeDate(startDate),
          step_code,
          timestamp,
          ticket.id,
        ]
      );

      await client.query(`DELETE FROM ticket_tags WHERE ticket_id = $1`, [ticket.id]);
      if (tags && Array.isArray(tags)) {
        for (const tag of tags) {
          await client.query(
            `INSERT INTO ticket_tags (ticket_id, tag_id, created_at) VALUES ($1, $2, NOW())`,
            [ticket.id, tag.id]
          );
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
});

// ----------------------------------------------------------------------
// DELETE ticket (Admins only)
// ----------------------------------------------------------------------
// ✅ Fixed: Using authenticateToken([1]) (Admins only)
router.delete("/:id", authenticateToken([1]), async (req, res) => {
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
});

module.exports = router;
