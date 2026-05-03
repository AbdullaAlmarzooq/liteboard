// server/features/comments/comments.service.js

const db = require("../../db/db");
const { buildCommentPreview, insertEvent } = require("../../utils/events");
const { resolveReadableTicketId } = require("../../utils/projectAccess");

class CommentsServiceError extends Error {
  constructor(status, body, code = "COMMENTS_SERVICE_ERROR") {
    const normalizedBody = typeof body === "string" ? { error: body } : body;
    super(normalizedBody?.error || "Comment service error");
    this.name = "CommentsServiceError";
    this.status = status;
    this.code = code;
    this.body = normalizedBody || { error: this.message };
  }
}

const createServiceError = (status, body, code) =>
  new CommentsServiceError(status, body, code);

const isCommentsServiceError = (error) => error instanceof CommentsServiceError;

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

const getCommentForOwnership = async (commentId) => {
  const comment = await resolveCommentById(commentId);

  if (!comment) {
    throw createServiceError(404, { error: "Comment not found" }, "NOT_FOUND");
  }

  return comment;
};

const getComments = async ({ ticketId, user }) => {
  if (!ticketId) {
    throw createServiceError(
      400,
      { error: "ticketId query parameter is required" },
      "VALIDATION_ERROR"
    );
  }

  const resolvedTicketId = await resolveReadableTicketId(user, ticketId);
  if (!resolvedTicketId) {
    throw createServiceError(404, { error: "Ticket not found" }, "NOT_FOUND");
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
  return rows;
};

const createComment = async ({ body, user }) => {
  const { ticket_id, text, comment_type } = body;

  if (!ticket_id || !text) {
    throw createServiceError(
      400,
      { error: "ticket_id and text are required" },
      "VALIDATION_ERROR"
    );
  }

  const resolvedTicketId = await resolveTicketId(ticket_id);
  if (!resolvedTicketId) {
    throw createServiceError(404, { error: "Ticket not found" }, "NOT_FOUND");
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
      [resolvedTicketId, text, user.id, comment_type || "comment"]
    );
    createdCommentId = result.rows[0].id;

    await insertEvent(client, {
      ticketId: resolvedTicketId,
      eventType: "comment.created",
      entityType: "comment",
      entityId: createdCommentId,
      actorId: user.id,
      actorName: user.name,
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

  return {
    message: "Comment created",
    id: createdCommentId,
  };
};

const updateComment = async ({ id, text, user, commentRecord }) => {
  if (!text) {
    throw createServiceError(400, { error: "text is required" }, "VALIDATION_ERROR");
  }

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
        ticketId: commentRecord.ticket_id,
        eventType: "comment.edited",
        entityType: "comment",
        entityId: id,
        actorId: user.id,
        actorName: user.name,
        payload: {
          comment_type: commentRecord.comment_type || "comment",
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
    throw createServiceError(404, { error: "Comment not found" }, "NOT_FOUND");
  }

  return { message: "Comment updated" };
};

const deleteComment = async ({ id }) => {
  const result = await db.query("DELETE FROM comments WHERE id = $1", [id]);

  if (result.rowCount === 0) {
    throw createServiceError(404, { error: "Comment not found" }, "NOT_FOUND");
  }

  return { message: "Comment deleted" };
};

module.exports = {
  CommentsServiceError,
  isCommentsServiceError,
  resolveTicketIdByCommentId,
  getCommentForOwnership,
  getComments,
  createComment,
  updateComment,
  deleteComment,
};
