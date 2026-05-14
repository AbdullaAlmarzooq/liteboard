// server/features/workgroups/workgroups.service.js

const db = require("../../db/db");
const { buildAdminChangePayload, createAdminEvent } = require("../../utils/events");

class WorkgroupsServiceError extends Error {
  constructor(status, body, code = "WORKGROUPS_SERVICE_ERROR") {
    const normalizedBody = typeof body === "string" ? { error: body } : body;
    super(normalizedBody?.error || "Workgroups service error");
    this.name = "WorkgroupsServiceError";
    this.status = status;
    this.code = code;
    this.body = normalizedBody || { error: this.message };
  }
}

const createServiceError = (status, body, code) =>
  new WorkgroupsServiceError(status, body, code);

const isWorkgroupsServiceError = (error) => error instanceof WorkgroupsServiceError;

const getAdminEventActor = (user) => ({
  id: user?.id || null,
  name: user?.name || null,
});

const generateWorkgroupCode = async () => {
  const { rows } = await db.query(
    `
      SELECT ticket_code
      FROM workgroups
      WHERE ticket_code ~ '^WG-[0-9]+$'
      ORDER BY CAST(SUBSTRING(ticket_code FROM 4) AS INTEGER) DESC
      LIMIT 1
    `
  );

  const currentCode = rows[0]?.ticket_code;
  if (!currentCode) {
    return "WG-001";
  }

  const currentNumber = Number.parseInt(currentCode.replace("WG-", ""), 10);
  const nextNumber = Number.isNaN(currentNumber) ? 1 : currentNumber + 1;
  return `WG-${String(nextNumber).padStart(3, "0")}`;
};

const listWorkgroups = async () => {
  const { rows } = await db.query(
    "SELECT id, ticket_code, name, description, active FROM workgroups WHERE deleted_at IS NULL ORDER BY name ASC"
  );

  return Array.isArray(rows) ? rows : [];
};

const createWorkgroup = async ({ body, user }) => {
  const { name, description, ticket_code, active } = body;

  if (!name || !String(name).trim()) {
    throw createServiceError(
      400,
      { error: "Workgroup name is required" },
      "VALIDATION_ERROR"
    );
  }

  const trimmedName = String(name).trim();
  const workgroupCode = ticket_code && String(ticket_code).trim()
    ? String(ticket_code).trim()
    : await generateWorkgroupCode();

  const client = await db.pool.connect();
  let createdWorkgroup = null;
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `
          INSERT INTO workgroups (ticket_code, name, description, active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          RETURNING id, ticket_code, name, description, active, created_at, updated_at
        `,
      [workgroupCode, trimmedName, description || null, active !== undefined ? !!active : true]
    );
    createdWorkgroup = rows[0];

    await createAdminEvent(client, {
      actor: getAdminEventActor(user),
      entity: "workgroup",
      action: "created",
      entityId: createdWorkgroup.id,
      entityName: createdWorkgroup.name,
      after: createdWorkgroup,
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      throw createServiceError(
        409,
        { error: "A workgroup with this name or code already exists" },
        "DUPLICATE_WORKGROUP"
      );
    }
    throw error;
  } finally {
    client.release();
  }

  return createdWorkgroup;
};

const updateWorkgroup = async ({ id, body, user }) => {
  const { name, description, active } = body;

  const beforeResult = await db.query(
    `
        SELECT id, ticket_code, name, description, active, created_at, updated_at
        FROM workgroups
        WHERE id = $1 AND deleted_at IS NULL
      `,
    [id]
  );
  const beforeWorkgroup = beforeResult.rows[0];

  if (!beforeWorkgroup) {
    throw createServiceError(404, { error: "Workgroup not found" }, "NOT_FOUND");
  }

  const client = await db.pool.connect();
  let updatedWorkgroup = null;
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `
          UPDATE workgroups
          SET name = $1,
              description = $2,
              active = $3,
              updated_at = NOW()
          WHERE id = $4 AND deleted_at IS NULL
          RETURNING id, ticket_code, name, description, active, created_at, updated_at
        `,
      [
        name ? String(name).trim() : beforeWorkgroup.name,
        description !== undefined ? description || null : beforeWorkgroup.description,
        active !== undefined ? !!active : beforeWorkgroup.active,
        id,
      ]
    );
    updatedWorkgroup = rows[0];

    const { changes, before, after } = buildAdminChangePayload(beforeWorkgroup, updatedWorkgroup, {
      fields: ["name", "description"],
      fieldLabels: {
        name: "Name",
        description: "Description",
      },
    });

    if (changes.length > 0) {
      await createAdminEvent(client, {
        actor: getAdminEventActor(user),
        entity: "workgroup",
        action: "updated",
        entityId: id,
        entityName: updatedWorkgroup.name,
        changes,
        before,
        after,
      });
    }

    if (beforeWorkgroup.active !== updatedWorkgroup.active) {
      await createAdminEvent(client, {
        actor: getAdminEventActor(user),
        entity: "workgroup",
        action: updatedWorkgroup.active ? "activated" : "deactivated",
        entityId: id,
        entityName: updatedWorkgroup.name,
        changes: [{
          field: "active",
          label: "Active",
          old_value: beforeWorkgroup.active,
          new_value: updatedWorkgroup.active,
        }],
        before: beforeWorkgroup,
        after: updatedWorkgroup,
      });
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      throw createServiceError(
        409,
        { error: "A workgroup with this name or code already exists" },
        "DUPLICATE_WORKGROUP"
      );
    }
    throw error;
  } finally {
    client.release();
  }

  return updatedWorkgroup;
};

const deleteWorkgroup = async ({ id, user }) => {
  const beforeResult = await db.query(
    `
        SELECT id, ticket_code, name, description, active, created_at, updated_at
        FROM workgroups
        WHERE id = $1 AND deleted_at IS NULL
      `,
    [id]
  );
  const beforeWorkgroup = beforeResult.rows[0];

  if (!beforeWorkgroup) {
    throw createServiceError(404, { error: "Workgroup not found" }, "NOT_FOUND");
  }

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `
          UPDATE workgroups
          SET active = false, deleted_at = NOW(), updated_at = NOW()
          WHERE id = $1 AND deleted_at IS NULL
        `,
      [id]
    );

    await createAdminEvent(client, {
      actor: getAdminEventActor(user),
      entity: "workgroup",
      action: "deleted",
      entityId: beforeWorkgroup.id,
      entityName: beforeWorkgroup.name,
      before: beforeWorkgroup,
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return { message: "Workgroup deleted successfully" };
};

module.exports = {
  WorkgroupsServiceError,
  isWorkgroupsServiceError,
  listWorkgroups,
  createWorkgroup,
  updateWorkgroup,
  deleteWorkgroup,
};
