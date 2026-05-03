// server/features/employees/employees.service.js

const bcrypt = require("bcryptjs");
const db = require("../../db/db");
const { buildAdminChangePayload, createAdminEvent } = require("../../utils/events");

class EmployeesServiceError extends Error {
  constructor(status, body, code = "EMPLOYEES_SERVICE_ERROR") {
    const normalizedBody = typeof body === "string" ? { error: body } : body;
    super(normalizedBody?.error || "Employees service error");
    this.name = "EmployeesServiceError";
    this.status = status;
    this.code = code;
    this.body = normalizedBody || { error: this.message };
  }
}

const createServiceError = (status, body, code) =>
  new EmployeesServiceError(status, body, code);

const isEmployeesServiceError = (error) => error instanceof EmployeesServiceError;

const getAdminEventActor = (user) => ({
  id: user?.id || null,
  name: user?.name || null,
});

const getRoles = async () => {
  const rolesQuery = `
      SELECT id, name, description
      FROM roles
      ORDER BY id ASC
    `;
  const { rows } = await db.query(rolesQuery);
  return rows;
};

const listEmployees = async () => {
  const employeesQuery = `
      SELECT 
        e.id, 
        e.name,
        e.email,
        e.active,
        e.workgroup_id AS "workgroupId",
        e.workgroup_id AS "workgroupCode",
        w.name AS "workgroupName",
        e.role_id AS "roleId",
        r.name AS "roleName"
      FROM employees e
      LEFT JOIN workgroups w ON e.workgroup_id = w.id
      LEFT JOIN roles r ON e.role_id = r.id
      ORDER BY e.name ASC
    `;
  const { rows } = await db.query(employeesQuery);

  return Array.isArray(rows) ? rows : [];
};

const getEmployeeById = async ({ id }) => {
  const employeeQuery = `
      SELECT 
        e.id, 
        e.name, 
        e.email,
        e.workgroup_id AS "workgroupId",
        e.workgroup_id AS "workgroupCode",
        w.name AS "workgroupName",
        e.role_id AS "roleId",
        r.name AS "roleName",
        e.active, 
        e.created_at, 
        e.updated_at
      FROM employees e
      LEFT JOIN workgroups w ON e.workgroup_id = w.id
      LEFT JOIN roles r ON e.role_id = r.id
      WHERE e.id = $1
    `;
  const { rows } = await db.query(employeeQuery, [id]);
  const employee = rows[0];

  if (!employee) {
    throw createServiceError(404, { error: "Employee not found" }, "NOT_FOUND");
  }

  return employee;
};

const createEmployee = async ({ body, user }) => {
  const { name, email, workgroup_id, workgroup_code, role_id, roleId, password, active } = body;
  const finalWorkgroupId = workgroup_id || workgroup_code || null;
  const finalRoleId = role_id || roleId || 3;

  if (!name || !email || !password) {
    throw createServiceError(
      400,
      { error: "Name, email, and password are required fields" },
      "VALIDATION_ERROR"
    );
  }

  const existingResult = await db.query(
    "SELECT id FROM employees WHERE email = $1",
    [email]
  );
  const existing = existingResult.rows[0];
  if (existing) {
    throw createServiceError(
      409,
      { error: "Employee with this email already exists" },
      "DUPLICATE_EMPLOYEE"
    );
  }

  if (finalRoleId) {
    const roleExistsResult = await db.query(
      "SELECT id FROM roles WHERE id = $1",
      [finalRoleId]
    );
    const roleExists = roleExistsResult.rows[0];
    if (!roleExists) {
      throw createServiceError(
        400,
        { error: "Invalid role_id" },
        "VALIDATION_ERROR"
      );
    }
  }

  let passwordHash = null;
  if (password && password.trim() !== "") {
    const salt = bcrypt.genSaltSync(10);
    passwordHash = bcrypt.hashSync(password, salt);
  }

  const client = await db.pool.connect();
  let createdEmployeeId = null;
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
          INSERT INTO employees
            (name, email, workgroup_id, role_id, password_hash, active)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `,
      [name, email, finalWorkgroupId, finalRoleId, passwordHash, active !== undefined ? !!active : true]
    );
    createdEmployeeId = result.rows[0].id;

    await createAdminEvent(client, {
      actor: getAdminEventActor(user),
      entity: "user",
      action: "created",
      entityId: createdEmployeeId,
      entityName: name,
      after: {
        id: createdEmployeeId,
        name,
        email,
        workgroup_id: finalWorkgroupId,
        role_id: finalRoleId,
        active: active !== undefined ? !!active : true,
      },
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const createdEmployeeResult = await db.query(
    `
        SELECT 
          e.id,
          e.name,
          e.email,
          e.workgroup_id AS "workgroupId",
          e.workgroup_id AS "workgroupCode",
          w.name AS "workgroupName",
          e.role_id AS "roleId",
          r.name AS "roleName",
          e.active
        FROM employees e
        LEFT JOIN workgroups w ON e.workgroup_id = w.id
        LEFT JOIN roles r ON e.role_id = r.id
      WHERE e.id = $1
      `,
    [createdEmployeeId]
  );

  return createdEmployeeResult.rows[0];
};

const updateEmployee = async ({ id, body, user }) => {
  const {
    name,
    email,
    roleId,
    workgroupId,
    workgroupCode,
    active,
    password,
  } = body;

  const employeeResult = await db.query(
    `
        SELECT id, name, email, workgroup_id, role_id, active, created_at, updated_at
        FROM employees
        WHERE id = $1
      `,
    [id]
  );
  const employee = employeeResult.rows[0];
  if (!employee) {
    throw createServiceError(404, { error: "Employee not found" }, "NOT_FOUND");
  }

  let passwordHash = null;
  if (password && password.trim() !== "") {
    const salt = bcrypt.genSaltSync(10);
    passwordHash = bcrypt.hashSync(password, salt);
  }

  const finalWorkgroupId = workgroupId || workgroupCode || employee.workgroup_id;
  const finalRoleId = roleId || employee.role_id;
  const finalActive = active !== undefined ? !!active : employee.active;

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");

    const updateParams = [
      name || employee.name,
      email || employee.email,
      finalRoleId,
      finalWorkgroupId,
      finalActive,
      id,
    ];
    const passwordSql = passwordHash ? ", password_hash = $7" : "";
    if (passwordHash) {
      updateParams.push(passwordHash);
    }

    await client.query(
      `
          UPDATE employees
          SET name = $1,
              email = $2,
              role_id = $3,
              workgroup_id = $4,
              active = $5${passwordSql}
          WHERE id = $6
          RETURNING id
        `,
      updateParams
    );

    const afterEmployee = {
      ...employee,
      name: name || employee.name,
      email: email || employee.email,
      role_id: finalRoleId,
      workgroup_id: finalWorkgroupId,
      active: finalActive,
    };
    const { changes, before, after } = buildAdminChangePayload(employee, afterEmployee, {
      fields: ["name", "email", "workgroup_id", "active"],
      fieldLabels: {
        name: "Name",
        email: "Email",
        workgroup_id: "Workgroup",
        active: "Active",
      },
    });

    if (changes.length > 0 || passwordHash) {
      const passwordOnlyUpdate = passwordHash && changes.length === 0;

      await createAdminEvent(client, {
        actor: getAdminEventActor(user),
        entity: "user",
        action: "updated",
        entityId: id,
        entityName: afterEmployee.name,
        changes,
        before,
        after,
        payload: {
          credentials_updated: Boolean(passwordHash),
          ...(passwordHash ? { credential_type: "password" } : {}),
          ...(passwordOnlyUpdate
            ? {
                message: `${user?.name || "Unknown actor"} changed the password for user "${afterEmployee.name}"`,
              }
            : {}),
        },
      });
    }

    if (Number(employee.role_id) !== Number(finalRoleId)) {
      await createAdminEvent(client, {
        actor: getAdminEventActor(user),
        entity: "user",
        action: "role_changed",
        entityId: id,
        entityName: afterEmployee.name,
        changes: [{
          field: "role_id",
          label: "Role",
          old_value: employee.role_id,
          new_value: finalRoleId,
        }],
        before,
        after,
      });
    }

    if (employee.active !== finalActive) {
      await createAdminEvent(client, {
        actor: getAdminEventActor(user),
        entity: "user",
        action: finalActive ? "activated" : "deactivated",
        entityId: id,
        entityName: afterEmployee.name,
        changes: [{
          field: "active",
          label: "Active",
          old_value: employee.active,
          new_value: finalActive,
        }],
        before,
        after,
      });
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const updatedEmployeeResult = await db.query(`
      SELECT 
        e.id,
        e.name,
        e.email,
        e.workgroup_id AS "workgroupId",
        e.workgroup_id AS "workgroupCode",
        w.name AS "workgroupName",
        e.role_id AS "roleId",
        r.name AS "roleName",
        e.active
      FROM employees e
      LEFT JOIN workgroups w ON e.workgroup_id = w.id
      LEFT JOIN roles r ON e.role_id = r.id
      WHERE e.id = $1
    `, [id]);
  return updatedEmployeeResult.rows[0];
};

module.exports = {
  EmployeesServiceError,
  isEmployeesServiceError,
  getRoles,
  listEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
};
