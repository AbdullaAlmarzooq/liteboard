// server/features/tags/tags.service.js

const db = require("../../db/db");
const { buildProjectAccessFilter, getProjectAccess, resolveReadableTicketId } = require("../../utils/projectAccess");
const { buildAdminChangePayload, createAdminEvent, insertEvent } = require("../../utils/events");

class TagsServiceError extends Error {
  constructor(status, body, code = "TAGS_SERVICE_ERROR") {
    const normalizedBody = typeof body === "string" ? { error: body } : body;
    super(normalizedBody?.error || "Tags service error");
    this.name = "TagsServiceError";
    this.status = status;
    this.code = code;
    this.body = normalizedBody || { error: this.message };
  }
}

const createServiceError = (status, body, code) =>
  new TagsServiceError(status, body, code);

const isTagsServiceError = (error) => error instanceof TagsServiceError;

const getAdminEventRequest = (user) => ({ user });

const resolveTicketId = async (ticketId) => {
  const { rows } = await db.query(
    "SELECT id FROM tickets WHERE (id::text = $1 OR ticket_code = $1) AND deleted_at IS NULL",
    [ticketId]
  );
  return rows[0]?.id || null;
};

const getTags = async ({ query, user }) => {
  const { project_id: projectId } = query;

  if (projectId) {
    const projectAccess = await getProjectAccess(user, projectId, {
      requireActiveForNonAdmin: true,
    });

    if (projectAccess.status !== 200) {
      throw createServiceError(
        projectAccess.status,
        { error: projectAccess.message },
        "PROJECT_ACCESS_ERROR"
      );
    }
  }

  let projectAccessClause = "";
  let projectAccessParams = [];

  if (projectId) {
    projectAccessClause = "\n      AND t.project_id = $1";
    projectAccessParams = [projectId];
  } else {
    const accessFilter = await buildProjectAccessFilter(user, "t.project_id");
    projectAccessClause = accessFilter.clause;
    projectAccessParams = accessFilter.params;
  }

  const tagsQuery = `
    SELECT
      t.id,
      t.label,
      t.color,
      t.project_id,
      p.name AS project_name,
      t.created_at,
      t.updated_at
    FROM tags t
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE t.deleted_at IS NULL${projectAccessClause}
    ORDER BY COALESCE(p.name, 'Unassigned Project') ASC, t.label ASC
  `;
  const { rows } = await db.query(tagsQuery, projectAccessParams);

  return Array.isArray(rows) ? rows : [];
};

const createTag = async ({ body, user }) => {
  const { label, color, project_id } = body;

  if (!label) {
    throw createServiceError(400, { error: "Tag label is required." }, "VALIDATION_ERROR");
  }

  if (!project_id) {
    throw createServiceError(400, { error: "project_id is required." }, "VALIDATION_ERROR");
  }

  const projectResult = await db.query(
    `
      SELECT id, name
      FROM projects
      WHERE id = $1
      LIMIT 1
    `,
    [project_id]
  );
  const project = projectResult.rows[0];

  if (!project) {
    throw createServiceError(404, { error: "Project not found." }, "NOT_FOUND");
  }

  const existingResult = await db.query(
    `
      SELECT id
      FROM tags
      WHERE COALESCE(project_id, '') = COALESCE($1, '')
        AND lower(label) = lower($2)
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [project_id, label]
  );
  const existing = existingResult.rows[0];
  if (existing) {
    throw createServiceError(
      409,
      { error: "Tag with this label already exists." },
      "DUPLICATE_TAG"
    );
  }

  const client = await db.pool.connect();
  let createdTag = null;
  try {
    await client.query("BEGIN");

    const insertResult = await client.query(
      `
        INSERT INTO tags (label, color, project_id, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING id, label, color, project_id
      `,
      [label, color || "#666666", project_id]
    );
    createdTag = insertResult.rows[0];

    await createAdminEvent(client, {
      req: getAdminEventRequest(user),
      entity: "tag",
      action: "created",
      entityId: createdTag.id,
      entityName: createdTag.label,
      after: {
        ...createdTag,
        project_name: project.name,
      },
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505" || error.message.includes("duplicate key")) {
      throw createServiceError(
        409,
        { error: "Tag with this label already exists." },
        "DUPLICATE_TAG"
      );
    }
    throw error;
  } finally {
    client.release();
  }

  return {
    message: "Tag created successfully",
    id: createdTag.id,
    label: createdTag.label,
    color: createdTag.color,
    project_id: createdTag.project_id,
    project_name: project.name,
  };
};

const updateTag = async ({ id, body, user }) => {
  const { label, color } = body;

  if (!label && !color) {
    throw createServiceError(
      400,
      { error: "At least one field (label or color) is required for update." },
      "VALIDATION_ERROR"
    );
  }

  const existingResult = await db.query(
    `
      SELECT t.id, t.label, t.color, t.project_id, p.name AS project_name
      FROM tags t
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.id = $1 AND t.deleted_at IS NULL
    `,
    [id]
  );
  const existingTag = existingResult.rows[0];

  if (!existingTag) {
    throw createServiceError(404, { error: "Tag not found" }, "NOT_FOUND");
  }

  const newLabel = label !== undefined ? label : existingTag.label;
  const newColor = color !== undefined ? color : existingTag.color;

  if (label !== undefined) {
    const duplicateResult = await db.query(
      `
        SELECT id
        FROM tags
        WHERE COALESCE(project_id, '') = COALESCE($1, '')
          AND lower(label) = lower($2)
          AND id <> $3
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [existingTag.project_id, newLabel, id]
    );

    if (duplicateResult.rows[0]) {
      throw createServiceError(
        409,
        { error: "Tag with this label already exists." },
        "DUPLICATE_TAG"
      );
    }
  }

  const client = await db.pool.connect();
  let rowCount = 0;
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
        UPDATE tags
        SET label = $1, color = $2, updated_at = NOW()
        WHERE id = $3 AND deleted_at IS NULL
        RETURNING id, label, color, project_id
      `,
      [newLabel, newColor, id]
    );
    rowCount = result.rowCount;

    if (rowCount > 0) {
      const updatedTag = {
        ...result.rows[0],
        project_name: existingTag.project_name,
      };
      const { changes, before, after } = buildAdminChangePayload(existingTag, updatedTag, {
        fields: ["label", "color"],
        fieldLabels: {
          label: "Label",
          color: "Color",
        },
      });

      if (changes.length > 0) {
        await createAdminEvent(client, {
          req: getAdminEventRequest(user),
          entity: "tag",
          action: "updated",
          entityId: id,
          entityName: updatedTag.label,
          changes,
          before,
          after,
        });
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505" || error.message.includes("duplicate key")) {
      throw createServiceError(
        409,
        { error: "Tag with this label already exists." },
        "DUPLICATE_TAG"
      );
    }
    throw error;
  } finally {
    client.release();
  }

  if (rowCount === 0) {
    return {
      message: "Tag updated successfully (or no changes made).",
    };
  }

  return { message: "Tag updated successfully" };
};

const deleteTag = async ({ id, user }) => {
  const existingResult = await db.query(
    `
      SELECT t.id, t.label, t.color, t.project_id, p.name AS project_name
      FROM tags t
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.id = $1 AND t.deleted_at IS NULL
    `,
    [id]
  );
  const existingTag = existingResult.rows[0];

  if (!existingTag) {
    throw createServiceError(404, { error: "Tag not found" }, "NOT_FOUND");
  }

  const client = await db.pool.connect();
  let rowCount = 0;
  try {
    await client.query("BEGIN");

    const result = await client.query("DELETE FROM tags WHERE id = $1", [id]);
    rowCount = result.rowCount;

    if (rowCount > 0) {
      await createAdminEvent(client, {
        req: getAdminEventRequest(user),
        entity: "tag",
        action: "deleted",
        entityId: existingTag.id,
        entityName: existingTag.label,
        before: existingTag,
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
    throw createServiceError(404, { error: "Tag not found" }, "NOT_FOUND");
  }

  return { message: "Tag deleted successfully" };
};

const getTicketTags = async ({ ticketId, user }) => {
  const resolvedTicketId = await resolveReadableTicketId(user, ticketId);
  if (!resolvedTicketId) {
    throw createServiceError(404, { error: "Ticket not found" }, "NOT_FOUND");
  }

  const tagsQuery = `
    SELECT
      t.id, t.label, t.color
    FROM tags t
    JOIN ticket_tags tt ON t.id = tt.tag_id
    WHERE tt.ticket_id = $1
    ORDER BY t.label ASC
  `;

  const { rows } = await db.query(tagsQuery, [resolvedTicketId]);
  return Array.isArray(rows) ? rows : [];
};

const addTagToTicket = async ({ body, user }) => {
  const { ticket_id, tag_id } = body;

  if (!ticket_id || !tag_id) {
    throw createServiceError(
      400,
      { error: "Both ticket_id and tag_id are required" },
      "VALIDATION_ERROR"
    );
  }

  const resolvedTicketId = await resolveTicketId(ticket_id);
  if (!resolvedTicketId) {
    throw createServiceError(
      404,
      { error: "Ticket or Tag ID does not exist" },
      "NOT_FOUND"
    );
  }

  const tagResult = await db.query(
    `
      SELECT id, label, color
      FROM tags
      WHERE id = $1
      LIMIT 1
    `,
    [tag_id]
  );
  const tag = tagResult.rows[0];
  if (!tag) {
    throw createServiceError(
      404,
      { error: "Ticket or Tag ID does not exist" },
      "NOT_FOUND"
    );
  }

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `
        INSERT INTO ticket_tags (ticket_id, tag_id)
        VALUES ($1, $2)
      `,
      [resolvedTicketId, tag_id]
    );

    await insertEvent(client, {
      ticketId: resolvedTicketId,
      eventType: "tag.added",
      entityType: "tag",
      entityId: tag.id,
      actorId: user.id,
      actorName: user.name,
      payload: {
        tag_label: tag.label,
        tag_color: tag.color,
      },
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.message.includes("duplicate key")) {
      throw createServiceError(
        409,
        { error: "Tag is already associated with this ticket" },
        "DUPLICATE_TAG_ASSOCIATION"
      );
    }
    if (
      error.message.includes("FOREIGN KEY constraint failed") ||
      error.message.includes("violates foreign key constraint")
    ) {
      throw createServiceError(
        404,
        { error: "Ticket or Tag ID does not exist" },
        "NOT_FOUND"
      );
    }
    throw error;
  } finally {
    client.release();
  }

  return { message: "Tag associated successfully" };
};

const removeTagFromTicket = async ({ ticketId, tagId, user }) => {
  const resolvedTicketId = await resolveTicketId(ticketId);
  if (!resolvedTicketId) {
    throw createServiceError(
      404,
      { error: "Tag association not found for this ticket" },
      "NOT_FOUND"
    );
  }

  const tagResult = await db.query(
    `
      SELECT id, label, color
      FROM tags
      WHERE id = $1
      LIMIT 1
    `,
    [tagId]
  );
  const tag = tagResult.rows[0];

  const client = await db.pool.connect();
  let deletedCount = 0;
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
        DELETE FROM ticket_tags
        WHERE ticket_id = $1 AND tag_id = $2
      `,
      [resolvedTicketId, tagId]
    );
    deletedCount = result.rowCount;

    if (deletedCount > 0 && tag) {
      await insertEvent(client, {
        ticketId: resolvedTicketId,
        eventType: "tag.removed",
        entityType: "tag",
        entityId: tag.id,
        actorId: user.id,
        actorName: user.name,
        payload: {
          tag_label: tag.label,
          tag_color: tag.color,
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

  if (deletedCount === 0) {
    throw createServiceError(
      404,
      { error: "Tag association not found for this ticket" },
      "NOT_FOUND"
    );
  }

  return { message: "Tag removed successfully" };
};

const replaceTicketTags = async ({ ticketId, body, user }) => {
  const { tag_ids } = body;

  if (!Array.isArray(tag_ids)) {
    throw createServiceError(
      400,
      { error: "tag_ids must be an array" },
      "VALIDATION_ERROR"
    );
  }

  const resolvedTicketId = await resolveTicketId(ticketId);
  if (!resolvedTicketId) {
    throw createServiceError(404, { error: "Ticket not found" }, "NOT_FOUND");
  }

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");

    const existingTagsResult = await client.query(
      `
        SELECT tg.id, tg.label, tg.color
        FROM ticket_tags tt
        JOIN tags tg ON tg.id = tt.tag_id
        WHERE tt.ticket_id = $1
      `,
      [resolvedTicketId]
    );
    const existingTags = existingTagsResult.rows;

    let replacementTags = [];
    if (tag_ids.length > 0) {
      const replacementTagsResult = await client.query(
        `
          SELECT id, label, color
          FROM tags
          WHERE id = ANY($1::uuid[])
        `,
        [tag_ids]
      );

      if (replacementTagsResult.rows.length !== tag_ids.length) {
        await client.query("ROLLBACK");
        throw createServiceError(
          400,
          { error: "One or more Tag IDs provided are invalid" },
          "VALIDATION_ERROR"
        );
      }

      replacementTags = replacementTagsResult.rows;
    }

    await client.query("DELETE FROM ticket_tags WHERE ticket_id = $1", [resolvedTicketId]);

    for (const tagId of tag_ids) {
      await client.query(
        "INSERT INTO ticket_tags (ticket_id, tag_id) VALUES ($1, $2)",
        [resolvedTicketId, tagId]
      );
    }

    const existingById = new Map(existingTags.map((tag) => [String(tag.id), tag]));
    const replacementById = new Map(replacementTags.map((tag) => [String(tag.id), tag]));

    for (const [tagId, tag] of replacementById.entries()) {
      if (!existingById.has(tagId)) {
        await insertEvent(client, {
          ticketId: resolvedTicketId,
          eventType: "tag.added",
          entityType: "tag",
          entityId: tag.id,
          actorId: user.id,
          actorName: user.name,
          payload: {
            tag_label: tag.label,
            tag_color: tag.color,
          },
        });
      }
    }

    for (const [tagId, tag] of existingById.entries()) {
      if (!replacementById.has(tagId)) {
        await insertEvent(client, {
          ticketId: resolvedTicketId,
          eventType: "tag.removed",
          entityType: "tag",
          entityId: tag.id,
          actorId: user.id,
          actorName: user.name,
          payload: {
            tag_label: tag.label,
            tag_color: tag.color,
          },
        });
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    if (error instanceof TagsServiceError) {
      throw error;
    }

    await client.query("ROLLBACK");
    if (
      error.message.includes("FOREIGN KEY constraint failed") ||
      error.message.includes("violates foreign key constraint")
    ) {
      throw createServiceError(
        400,
        { error: "One or more Tag IDs provided are invalid" },
        "VALIDATION_ERROR"
      );
    }
    throw error;
  } finally {
    client.release();
  }

  return { message: "Tags updated successfully" };
};

module.exports = {
  TagsServiceError,
  isTagsServiceError,
  getTags,
  createTag,
  updateTag,
  deleteTag,
  getTicketTags,
  addTagToTicket,
  removeTagFromTicket,
  replaceTicketTags,
};
