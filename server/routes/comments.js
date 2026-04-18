// server/routes/comments.js
const express = require("express");
const db = require("../db/db");
const router = express.Router();
const authenticateToken = require("../middleware/authMiddleware");
const { ensureTicketIsEditable } = require("../middleware/ensureTicketIsEditable");
const { buildCommentPreview, insertEvent } = require("../utils/events");
const { resolveReadableTicketId } = require("../utils/projectAccess");

const resolveTicketId = async (ticketId) => {
  const { rows } = await db.query(
    "SELECT id FROM tickets WHERE (id::text = $1 OR ticket_code = $1) AND deleted_at IS NULL",
    [ticketId]
  );
  return rows[0]?.id || null;
};

const resolveCommentById = async (commentId) => {
  const { rows } = await db.query(
    `
      SELECT c.id, c.ticket_id, c.author_id, c.comment_type
      FROM comments c
      WHERE c.id = $1
      LIMIT 1
    `,
    [commentId]
  );

  return rows[0] || null;
};

const resolveTicketIdByCommentId = async (commentId) => {
  const comment = await resolveCommentById(commentId);
  return comment?.ticket_id || null;
};

const ensureCommentOwner = async (req, res, next) => {
  try {
    const comment = await resolveCommentById(req.params.id);

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (String(comment.author_id) !== String(req.user?.id)) {
      return res.status(403).json({ error: "You can only modify your own comments." });
    }

    req.commentRecord = comment;
    next();
  } catch (err) {
    console.error("Error validating comment ownership:", err);
    res.status(500).json({ error: "Failed to validate comment ownership" });
  }
};

// GET comments for a ticket
router.get("/", authenticateToken(), async (req, res) => {
  const { ticketId } = req.query;
  
  if (!ticketId) {
    return res.status(400).json({ error: "ticketId query parameter is required" });
  }
  
  try {
    const resolvedTicketId = await resolveReadableTicketId(req.user, ticketId);
    if (!resolvedTicketId) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const commentsQuery = `
      SELECT 
        c.id,
        c.ticket_id,
        c.text,
        c.comment_type,
        c.created_at AS timestamp,
        e.name AS author,
        c.author_id
      FROM comments c
      LEFT JOIN employees e ON c.author_id = e.id
      WHERE c.ticket_id = $1
      ORDER BY c.created_at ASC
    `;
    
    const { rows } = await db.query(commentsQuery, [resolvedTicketId]);
    const comments = rows;
    res.json(comments);
  } catch (err) {
    console.error("Error fetching comments:", err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// POST new comment
router.post("/", authenticateToken(), ensureTicketIsEditable({ bodyKey: "ticket_id" }), async (req, res) => {
  const { ticket_id, text, comment_type } = req.body;
  
  if (!ticket_id || !text) {
    return res.status(400).json({ error: "ticket_id and text are required" });
  }
  
  try {
    const resolvedTicketId = await resolveTicketId(ticket_id);
    if (!resolvedTicketId) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const client = await db.pool.connect();
    let createdCommentId = null;

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `
          INSERT INTO comments (ticket_id, text, author_id, comment_type, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          RETURNING id
        `,
        [resolvedTicketId, text, req.user.id, comment_type || "comment"]
      );
      createdCommentId = result.rows[0].id;

      await insertEvent(client, {
        ticketId: resolvedTicketId,
        eventType: "comment.created",
        entityType: "comment",
        entityId: createdCommentId,
        actorId: req.user.id,
        actorName: req.user.name,
        payload: {
          comment_type: comment_type || "comment",
          preview: buildCommentPreview(text),
        },
      });

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    res.status(201).json({
      message: "Comment created",
      id: createdCommentId,
    });
  } catch (err) {
    console.error("Error creating comment:", err);
    res.status(500).json({ error: "Failed to create comment" });
  }
});

// PUT update comment
router.put(
  "/:id",
  authenticateToken(),
  ensureTicketIsEditable({
    resolveTicketRef: async (req) => resolveTicketIdByCommentId(req.params.id),
  }),
  ensureCommentOwner,
  async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: "text is required" });
  }
  
  try {
    const client = await db.pool.connect();
    let rowCount = 0;

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `
          UPDATE comments
          SET text = $1, updated_at = NOW()
          WHERE id = $2
        `,
        [text, id]
      );
      rowCount = result.rowCount;

      if (rowCount > 0) {
        await insertEvent(client, {
          ticketId: req.commentRecord.ticket_id,
          eventType: "comment.edited",
          entityType: "comment",
          entityId: id,
          actorId: req.user.id,
          actorName: req.user.name,
          payload: {
            comment_type: req.commentRecord.comment_type || "comment",
          },
        });
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    
    if (rowCount === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }
    
    res.json({ message: "Comment updated" });
  } catch (err) {
    console.error("Error updating comment:", err);
    res.status(500).json({ error: "Failed to update comment" });
  }
  }
);

// DELETE comment
router.delete(
  "/:id",
  authenticateToken(),
  ensureTicketIsEditable({
    resolveTicketRef: async (req) => resolveTicketIdByCommentId(req.params.id),
  }),
  ensureCommentOwner,
  async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await db.query("DELETE FROM comments WHERE id = $1", [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }
    
    res.json({ message: "Comment deleted" });
  } catch (err) {
    console.error("Error deleting comment:", err);
    res.status(500).json({ error: "Failed to delete comment" });
  }
  }
);

module.exports = router;
