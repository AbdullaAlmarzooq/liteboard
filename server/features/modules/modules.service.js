// server/features/modules/modules.service.js

const db = require("../../db/db");
const { buildProjectAccessFilter, getProjectAccess } = require("../../utils/projectAccess");
const { buildAdminChangePayload, createAdminEvent } = require("../../utils/events");

class ModulesServiceError extends Error {
  constructor(status, body, code = "MODULES_SERVICE_ERROR") {
    const normalizedBody = typeof body === "string" ? { error: body } : body;
    super(normalizedBody?.error || "Modules service error");
    this.name = "ModulesServiceError";
    this.status = status;
    this.code = code;
    this.body = normalizedBody || { error: this.message };
  }
}

const createServiceError = (status, body, code) =>
  new ModulesServiceError(status, body, code);

const isModulesServiceError = (error) => error instanceof ModulesServiceError;

const getAdminEventActor = (user) => ({
  id: user?.id || null,
  name: user?.name || null,
});

const listModules = async ({ query, user }) => {
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

  const isAdmin = Number(user?.role_id) === 1;
  let selectPrefix = "";
  let joinClause = "";
  let whereClause = isAdmin && !projectId
    ? "WHERE m.deleted_at IS NULL"
    : "WHERE m.active = true AND m.deleted_at IS NULL";
  let queryParams = [];

  if (projectId) {
    joinClause = `
        JOIN project_modules pm ON pm.module_id = m.id
      `;
    queryParams = [projectId];
    whereClause += "\n      AND pm.project_id = $1";
  } else if (!isAdmin) {
    joinClause = `
        JOIN project_modules pm ON pm.module_id = m.id
      `;
    const accessFilter = await buildProjectAccessFilter(user, "pm.project_id");
    whereClause += accessFilter.clause;
    queryParams = accessFilter.params;
    selectPrefix = "DISTINCT ";
  }

  const modulesQuery = `
      SELECT 
        ${selectPrefix}m.id, 
        m.name, 
        m.description, 
        m.active, 
        m.created_at, 
        m.updated_at
      FROM modules m
      ${joinClause}
      ${whereClause}
      ORDER BY m.name ASC
    `;
  const { rows } = await db.query(modulesQuery, queryParams);

  return Array.isArray(rows) ? rows : [];
};

const getModuleById = async ({ id }) => {
  const moduleQuery = `
      SELECT 
        id, name, description, active, created_at, updated_at
      FROM modules
      WHERE id = $1 AND deleted_at IS NULL
    `;
  const { rows } = await db.query(moduleQuery, [id]);
  const module = rows[0];

  if (!module) {
    throw createServiceError(404, { error: "Module not found" }, "NOT_FOUND");
  }

  return module;
};

const createModule = async ({ body, user }) => {
  const { name, description } = body;

  if (!name) {
    throw createServiceError(
      400,
      { error: "Module name is required" },
      "VALIDATION_ERROR"
    );
  }

  const trimmedName = String(name).trim();
  const existingResult = await db.query(
    "SELECT id FROM modules WHERE name ILIKE $1 AND deleted_at IS NULL",
    [trimmedName]
  );
  const existing = existingResult.rows[0];
  if (existing) {
    throw createServiceError(
      409,
      { error: "A module with this name already exists" },
      "DUPLICATE_MODULE"
    );
  }

  const client = await db.pool.connect();
  let createdModule = null;
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `
          INSERT INTO modules (name, description)
          VALUES ($1, $2)
          RETURNING id, name, description, active, created_at, updated_at
        `,
      [trimmedName, description || null]
    );
    createdModule = rows[0];

    await createAdminEvent(client, {
      actor: getAdminEventActor(user),
      entity: "module",
      action: "created",
      entityId: createdModule.id,
      entityName: createdModule.name,
      after: createdModule,
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return {
    message: "Module created successfully",
    ...createdModule,
  };
};

const updateModule = async ({ id, body, user }) => {
  const { name, description, active } = body;

  if (!name) {
    throw createServiceError(
      400,
      { error: "Module name is required" },
      "VALIDATION_ERROR"
    );
  }

  const trimmedName = String(name).trim();
  const conflictResult = await db.query(
    "SELECT id FROM modules WHERE name ILIKE $1 AND id != $2 AND deleted_at IS NULL",
    [trimmedName, id]
  );
  const nameConflict = conflictResult.rows[0];
  if (nameConflict) {
    throw createServiceError(
      409,
      { error: "This module name is already in use by another module" },
      "DUPLICATE_MODULE"
    );
  }

  const beforeResult = await db.query(
    `
        SELECT id, name, description, active, created_at, updated_at
        FROM modules
        WHERE id = $1 AND deleted_at IS NULL
      `,
    [id]
  );
  const beforeModule = beforeResult.rows[0];

  if (!beforeModule) {
    throw createServiceError(404, { error: "Module not found" }, "NOT_FOUND");
  }

  const activeValue =
    typeof active === "boolean" ? active : active === undefined || active === null ? beforeModule.active : active;

  const client = await db.pool.connect();
  let rowCount = 0;
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
          UPDATE modules
          SET name = $1, description = $2, active = $3, updated_at = NOW()
          WHERE id = $4 AND deleted_at IS NULL
          RETURNING id, name, description, active, created_at, updated_at
        `,
      [trimmedName, description || null, activeValue, id]
    );
    rowCount = result.rowCount;

    if (rowCount > 0) {
      const afterModule = result.rows[0];
      const { changes, before, after } = buildAdminChangePayload(beforeModule, afterModule, {
        fields: ["name", "description"],
        fieldLabels: {
          name: "Name",
          description: "Description",
        },
      });

      if (changes.length > 0) {
        await createAdminEvent(client, {
          actor: getAdminEventActor(user),
          entity: "module",
          action: "updated",
          entityId: id,
          entityName: afterModule.name,
          changes,
          before,
          after,
        });
      }

      if (beforeModule.active !== afterModule.active) {
        await createAdminEvent(client, {
          actor: getAdminEventActor(user),
          entity: "module",
          action: afterModule.active ? "activated" : "deactivated",
          entityId: id,
          entityName: afterModule.name,
          changes: [{
            field: "active",
            label: "Active",
            old_value: beforeModule.active,
            new_value: afterModule.active,
          }],
          before: beforeModule,
          after: afterModule,
        });
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  if (rowCount === 0) {
    const existsResult = await db.query(
      "SELECT id FROM modules WHERE id = $1 AND deleted_at IS NULL",
      [id]
    );
    if (!existsResult.rows[0]) {
      throw createServiceError(404, { error: "Module not found" }, "NOT_FOUND");
    }
    return { message: "Module updated successfully (or no changes made)" };
  }

  return { message: "Module updated successfully" };
};

const deleteModule = async ({ id, user }) => {
  const beforeResult = await db.query(
    `
        SELECT id, name, description, active, created_at, updated_at
        FROM modules
        WHERE id = $1 AND deleted_at IS NULL
      `,
    [id]
  );
  const beforeModule = beforeResult.rows[0];

  if (!beforeModule) {
    throw createServiceError(404, { error: "Module not found" }, "NOT_FOUND");
  }

  const client = await db.pool.connect();
  let rowCount = 0;
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
          UPDATE modules
          SET active = false, deleted_at = NOW(), updated_at = NOW()
          WHERE id = $1 AND deleted_at IS NULL
        `,
      [id]
    );
    rowCount = result.rowCount;

    if (rowCount > 0) {
      await createAdminEvent(client, {
        actor: getAdminEventActor(user),
        entity: "module",
        action: "deleted",
        entityId: beforeModule.id,
        entityName: beforeModule.name,
        before: beforeModule,
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
    throw createServiceError(404, { error: "Module not found" }, "NOT_FOUND");
  }

  return { message: "Module deleted successfully" };
};

module.exports = {
  ModulesServiceError,
  isModulesServiceError,
  listModules,
  getModuleById,
  createModule,
  updateModule,
  deleteModule,
};
