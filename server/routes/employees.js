// server/routes/employees.js

const express = require("express");
const db = require("../db/db");
const router = express.Router();
const bcrypt = require("bcryptjs");


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
router.post("/", async (req, res) => {
  const { name, email, workgroup_id, workgroup_code, role_id, password } = req.body;
  const finalWorkgroupId = workgroup_id || workgroup_code || null;

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
    if (role_id) {
      const roleExistsResult = await db.query(
        "SELECT id FROM roles WHERE id = $1",
        [role_id]
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

    const result = await db.query(
      `
        INSERT INTO employees
          (name, email, workgroup_id, role_id, password_hash)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [name, email, finalWorkgroupId, role_id || 3, passwordHash]
    );

    res.status(201).json({ message: "Employee created successfully", id: result.rows[0].id });
  } catch (err) {
    console.error("Error creating employee:", err);
    res.status(500).json({ error: "Failed to create employee" });
  }
});

// ----------------------------------------------------------------------
// PUT update an existing employee
// ----------------------------------------------------------------------
router.put('/:id', async (req, res) => {
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
    const employeeResult = await db.query('SELECT * FROM employees WHERE id = $1', [id]);
    const employee = employeeResult.rows[0];
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    // Hash password if provided
    let passwordHash = employee.password_hash;
    if (password && password.trim() !== '') {
      const salt = bcrypt.genSaltSync(10);
      passwordHash = bcrypt.hashSync(password, salt);
    }

    // Final values
    const finalWorkgroupId = workgroupId || workgroupCode || employee.workgroup_id;
    const finalRoleId = roleId || employee.role_id;
    const finalActive = active !== undefined ? !!active : employee.active;

    await db.query(
      `
        UPDATE employees
        SET name = $1,
            email = $2,
            role_id = $3,
            workgroup_id = $4,
            active = $5,
            password_hash = $6
        WHERE id = $7
      `,
      [
        name || employee.name,
        email || employee.email,
        finalRoleId,
        finalWorkgroupId,
        finalActive,
        passwordHash,
        id,
      ]
    );

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
