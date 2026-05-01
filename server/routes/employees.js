// server/routes/employees.js

const express = require("express");
const db = require("../db/db");
const router = express.Router();
const bcrypt = require("bcryptjs");
const authenticateToken = require("../middleware/authMiddleware");
const { buildAdminChangePayload, createAdminEvent } = require("../utils/events");


// Helper function to generate sequential employee ID (e.g., EMP-001, EMP-002, ...)
// ----------------------------------------------------------------------
// GET all roles (for dropdowns in admin panel)
// ----------------------------------------------------------------------
router.get("/roles", async (req, res) => {
  try {
    const rolesQuery = `
      SELECT id, name, description
      FROM roles
      ORDER BY id ASC
    `;
    const { rows } = await db.query(rolesQuery);
    const roles = rows;
    res.json(roles);
  } catch (err) {
    console.error("Error fetching roles:", err);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
});

// ----------------------------------------------------------------------
// GET all active employees (for dropdowns)
// ----------------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
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

    res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

// ----------------------------------------------------------------------
// GET employee by ID
// ----------------------------------------------------------------------
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
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
      return res.status(404).json({ error: "Employee not found" });
    }

    res.json(employee);
  } catch (err) {
    console.error("Error fetching employee:", err);
    res.status(500).json({ error: "Failed to fetch employee" });
  }
});

// ----------------------------------------------------------------------
// POST create a new employee
// ----------------------------------------------------------------------
router.post("/", authenticateToken([1]), async (req, res) => {
  const { name, email, workgroup_id, workgroup_code, role_id, roleId, password, active } = req.body;
  const finalWorkgroupId = workgroup_id || workgroup_code || null;
  const finalRoleId = role_id || roleId || 3;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required fields" });
  }

  try {
    // Check if employee with this email already exists
    const existingResult = await db.query(
      "SELECT id FROM employees WHERE email = $1",
      [email]
    );
    const existing = existingResult.rows[0];
    if (existing) {
        return res.status(409).json({ error: "Employee with this email already exists" });
    }

    // Validate role_id if provided
    if (finalRoleId) {
      const roleExistsResult = await db.query(
        "SELECT id FROM roles WHERE id = $1",
        [finalRoleId]
      );
      const roleExists = roleExistsResult.rows[0];
      if (!roleExists) {
        return res.status(400).json({ error: "Invalid role_id" });
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
        req,
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

    res.status(201).json(createdEmployeeResult.rows[0]);
  } catch (err) {
    console.error("Error creating employee:", err);
    res.status(500).json({ error: "Failed to create employee" });
  }
});

// ----------------------------------------------------------------------
// PUT update an existing employee
// ----------------------------------------------------------------------
router.put('/:id', authenticateToken([1]), async (req, res) => {
  const { id } = req.params;
    const {
    name,
    email,
    roleId,
    workgroupId,
    workgroupCode,
    active,
    password
  } = req.body;

  try {
    const employeeResult = await db.query(
      `
        SELECT id, name, email, workgroup_id, role_id, active, created_at, updated_at
        FROM employees
        WHERE id = $1
      `,
      [id]
    );
    const employee = employeeResult.rows[0];
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    // Hash password if provided
    let passwordHash = null;
    if (password && password.trim() !== '') {
      const salt = bcrypt.genSaltSync(10);
      passwordHash = bcrypt.hashSync(password, salt);
    }

    // Final values
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
          req,
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
                  message: `${req.user?.name || "Unknown actor"} changed the password for user "${afterEmployee.name}"`,
                }
              : {}),
          },
        });
      }

      if (Number(employee.role_id) !== Number(finalRoleId)) {
        await createAdminEvent(client, {
          req,
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
          req,
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

    // Return updated employee with joined names
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
    const updatedEmployee = updatedEmployeeResult.rows[0];

    res.json(updatedEmployee);

  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});


module.exports = router;
