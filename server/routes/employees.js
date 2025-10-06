// server/routes/employees.js

const express = require("express");
const db = require("../db/db");
const router = express.Router();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");


// Helper function to generate sequential employee ID (e.g., EMP-001, EMP-002, ...)
const generateEmployeeId = (db) => {
  // Get the highest existing employee ID
  const row = db.prepare(`
    SELECT id 
    FROM employees 
    WHERE id LIKE 'EMP-%' 
    ORDER BY CAST(SUBSTR(id, 5) AS INTEGER) DESC 
    LIMIT 1
  `).get();

  let nextNumber = 1;
  if (row && row.id) {
    const lastNumber = parseInt(row.id.replace("EMP-", ""), 10);
    nextNumber = lastNumber + 1;
  }

  // Pad with leading zeros (EMP-001, EMP-010, EMP-100)
  return `EMP-${String(nextNumber).padStart(3, "0")}`;
};

// ----------------------------------------------------------------------
// GET all roles (for dropdowns in admin panel)
// ----------------------------------------------------------------------
router.get("/roles", (req, res) => {
  try {
    const rolesQuery = `
      SELECT id, name, description
      FROM roles
      ORDER BY id ASC
    `;
    const roles = db.prepare(rolesQuery).all();
    res.json(roles);
  } catch (err) {
    console.error("Error fetching roles:", err);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
});

// ----------------------------------------------------------------------
// GET all active employees (for dropdowns)
// ----------------------------------------------------------------------
router.get("/", (req, res) => {
  try {
    const employeesQuery = `
      SELECT 
        e.id, 
        e.name,
        e.email,
        e.active,
        e.workgroup_code AS workgroupId,
        w.name AS workgroupName,
        e.role_id AS roleId,
        r.name AS roleName
      FROM employees e
      LEFT JOIN workgroups w ON e.workgroup_code = w.id
      LEFT JOIN roles r ON e.role_id = r.id
      ORDER BY e.name ASC
    `;
    const rows = db.prepare(employeesQuery).all();

    res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

// ----------------------------------------------------------------------
// GET employee by ID
// ----------------------------------------------------------------------
router.get("/:id", (req, res) => {
  const { id } = req.params;
  try {
    const employeeQuery = `
      SELECT 
        e.id, 
        e.name, 
        e.email,
        e.workgroup_code AS workgroupId,
        w.name AS workgroupName,
        e.role_id AS roleId,
        r.name AS roleName,
        e.active, 
        e.created_at, 
        e.updated_at
      FROM employees e
      LEFT JOIN workgroups w ON e.workgroup_code = w.id
      LEFT JOIN roles r ON e.role_id = r.id
      WHERE e.id = ?
    `;
    const employee = db.prepare(employeeQuery).get(id);

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
router.post("/", (req, res) => {
  const { name, email, workgroup_code, role_id, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required fields" });
  }

  try {
    const newId = generateEmployeeId(db);
    
    // Check if employee with this email already exists
    const existing = db.prepare("SELECT id FROM employees WHERE email = ?").get(email);
    if (existing) {
        return res.status(409).json({ error: "Employee with this email already exists" });
    }

    // Validate role_id if provided
    if (role_id) {
      const roleExists = db.prepare("SELECT id FROM roles WHERE id = ?").get(role_id);
      if (!roleExists) {
        return res.status(400).json({ error: "Invalid role_id" });
      }
    }

    const insertEmployee = db.prepare(`
      INSERT INTO employees 
        (id, name, email, workgroup_code, role_id, password_hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    let passwordHash = null;

if (password && password.trim() !== "") {
  const salt = bcrypt.genSaltSync(10);
  passwordHash = bcrypt.hashSync(password, salt);
}


    insertEmployee.run(
      newId, 
      name, 
      email, 
      workgroup_code || null,
      role_id || 3  // Default to Viewer (role_id = 3)
    );

    res.status(201).json({ message: "Employee created successfully", id: newId });
  } catch (err) {
    console.error("Error creating employee:", err);
    res.status(500).json({ error: "Failed to create employee" });
  }
});

// ----------------------------------------------------------------------
// PUT update an existing employee
// ----------------------------------------------------------------------
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    name,
    email,
    roleId,
    workgroupId,
    active,
    password
  } = req.body;

  try {
    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    // Hash password if provided
    let passwordHash = employee.password_hash;
    if (password && password.trim() !== '') {
      const salt = bcrypt.genSaltSync(10);
      passwordHash = bcrypt.hashSync(password, salt);
    }

    // Final values
    const finalWorkgroupCode = workgroupId || employee.workgroup_code;
    const finalRoleId = roleId || employee.role_id;
    const finalActive = active !== undefined ? (active ? 1 : 0) : employee.active;

    db.prepare(`
      UPDATE employees
      SET name = ?,
          email = ?,
          role_id = ?,
          workgroup_code = ?,
          active = ?,
          password_hash = ?
      WHERE id = ?
    `).run(
      name || employee.name,
      email || employee.email,
      finalRoleId,
      finalWorkgroupCode,
      finalActive,
      passwordHash,
      id
    );

    // Return updated employee with joined names
    const updatedEmployee = db.prepare(`
      SELECT 
        e.id,
        e.name,
        e.email,
        e.workgroup_code AS workgroupId,
        w.name AS workgroupName,
        e.role_id AS roleId,
        r.name AS roleName,
        e.active
      FROM employees e
      LEFT JOIN workgroups w ON e.workgroup_code = w.id
      LEFT JOIN roles r ON e.role_id = r.id
      WHERE e.id = ?
    `).get(id);

    res.json(updatedEmployee);

  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});


module.exports = router;