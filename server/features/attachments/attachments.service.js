// server/features/attachments/attachments.service.js

const crypto = require("crypto");
const db = require("../../db/db");
const { insertEvent } = require("../../utils/events");
const {
  buildProjectAccessFilter,
  resolveReadableTicketId,
} = require("../../utils/projectAccess");

class AttachmentsServiceError extends Error {
  constructor(status, body, code = "ATTACHMENTS_SERVICE_ERROR") {
    const normalizedBody = typeof body === "string" ? { error: body } : body;
    super(normalizedBody?.error || "Attachment service error");
    this.name = "AttachmentsServiceError";
    this.status = status;
    this.code = code;
    this.body = normalizedBody || { error: this.message };
  }
}

const createServiceError = (status, body, code) =>
  new AttachmentsServiceError(status, body, code);

const isAttachmentsServiceError = (error) =>
  error instanceof AttachmentsServiceError;

const resolveTicketId = async (ticketId) => {
  const { rows } = await db.query(
    "SELECT id FROM tickets WHERE (id::text = $1 OR ticket_code = $1) AND deleted_at IS NULL",
    [ticketId]
  );
  return rows[0]?.id || null;
};

const resolveTicketIdByAttachmentId = async (attachmentId) => {
  const { rows } = await db.query(
    `
      SELECT a.ticket_id
      FROM attachments a
      WHERE a.id = $1
      LIMIT 1
    `,
    [attachmentId]
  );
  return rows[0]?.ticket_id || null;
};

const getAttachmentBlob = async ({ id, user }) => {
  const { clause: projectAccessClause, params: projectAccessParams } =
    await buildProjectAccessFilter(user, "t.project_id", [id]);

  const { rows } = await db.query(
    `
      SELECT ab.attachment_id, ab.base64_data
      FROM attachment_blobs ab
      JOIN attachments a ON a.id = ab.attachment_id
      JOIN tickets t ON t.id = a.ticket_id
      WHERE ab.attachment_id = $1
        AND t.deleted_at IS NULL${projectAccessClause}
    `,
    projectAccessParams
  );

  if (!rows[0]) {
    throw createServiceError(
      404,
      { error: "Attachment blob not found" },
      "NOT_FOUND"
    );
  }

  return rows[0];
};

const getAttachments = async ({ ticketId, user }) => {
  const resolvedTicketId = await resolveReadableTicketId(user, ticketId);
  if (!resolvedTicketId) {
    throw createServiceError(404, { error: "Ticket not found" }, "NOT_FOUND");
  }

  const { rows } = await db.query(
    `
      SELECT
        id, ticket_id,
        filename AS name,
        file_type AS type,
        file_size AS size,
        uploaded_at AS created_at,
        uploaded_by AS created_by,
        (ab.attachment_id IS NOT NULL) AS has_blob
      FROM attachments
      LEFT JOIN attachment_blobs ab ON ab.attachment_id = attachments.id
      WHERE ticket_id = $1
      ORDER BY uploaded_at ASC
    `,
    [resolvedTicketId]
  );

  return rows;
};

const createAttachment = async ({ body, user }) => {
  const { ticket_id, name, type, size, data, created_by } = body;

  if (!ticket_id || !name || !type || !size || !data) {
    throw createServiceError(
      400,
      { error: "Missing required fields" },
      "VALIDATION_ERROR"
    );
  }

  if (size > 1024 * 1024) {
    throw createServiceError(
      400,
      { error: "Attachment exceeds 1 MB limit" },
      "VALIDATION_ERROR"
    );
  }

  const resolvedTicketId = await resolveTicketId(ticket_id);
  if (!resolvedTicketId) {
    throw createServiceError(404, { error: "Ticket not found" }, "NOT_FOUND");
  }

  const newId = crypto.randomUUID();
  const storageKey = `inline://${newId}`;
  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        INSERT INTO attachments
          (id, ticket_id, filename, file_type, file_size, storage_key, uploaded_at, uploaded_by)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
      `,
      [newId, resolvedTicketId, name, type, size, storageKey, user.id || created_by]
    );

    await client.query(
      `
        INSERT INTO attachment_blobs (attachment_id, base64_data)
        VALUES ($1, $2)
      `,
      [newId, data]
    );

    await insertEvent(client, {
      ticketId: resolvedTicketId,
      eventType: "attachment.uploaded",
      entityType: "attachment",
      entityId: newId,
      actorId: user.id,
      actorName: user.name,
      payload: {
        filename: name,
        mime_type: type,
        file_size_bytes: Number(size),
      },
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return { message: "Attachment added", id: newId };
};

const deleteAttachment = async ({ id, user }) => {
  const attachmentResult = await db.query(
    `
      SELECT id, ticket_id, filename, file_type, file_size
      FROM attachments
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );
  const attachment = attachmentResult.rows[0];

  if (!attachment) {
    throw createServiceError(
      404,
      { error: "Attachment not found" },
      "NOT_FOUND"
    );
  }

  const client = await db.pool.connect();
  let didRollback = false;

  try {
    await client.query("BEGIN");

    const result = await client.query("DELETE FROM attachments WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      didRollback = true;
      throw createServiceError(
        404,
        { error: "Attachment not found" },
        "NOT_FOUND"
      );
    }

    await insertEvent(client, {
      ticketId: attachment.ticket_id,
      eventType: "attachment.deleted",
      entityType: "attachment",
      entityId: attachment.id,
      actorId: user.id,
      actorName: user.name,
      payload: {
        filename: attachment.filename,
        mime_type: attachment.file_type,
        file_size_bytes: Number(attachment.file_size),
      },
    });

    await client.query("COMMIT");
  } catch (error) {
    if (!didRollback) {
      await client.query("ROLLBACK");
    }
    throw error;
  } finally {
    client.release();
  }

  return { message: "Attachment deleted" };
};

module.exports = {
  AttachmentsServiceError,
  isAttachmentsServiceError,
  resolveTicketIdByAttachmentId,
  getAttachmentBlob,
  getAttachments,
  createAttachment,
  deleteAttachment,
};
