const express = require("express");
const db = require("../db/db");
const router = express.Router();
const crypto = require("crypto");

// Helper function to generate employee ID (e.g., EMP-xxxxxx)
const generateEmployeeId = () => {
  // Using a short random hex string for uniqueness
  return `EMP-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
};

// ----------------------------------------------------------------------
// GET all active employees (for dropdowns)
// ----------------------------------------------------------------------
router.get("/", (req, res) => {
  try {
    const employeesQuery = `
      SELECT 
        id, 
        name, 
        email, 
        position, 
        department, 
        workgroup_code AS workgroupId
      FROM employees
      WHERE active = 1
      ORDER BY name ASC
    `;
    const rows = db.prepare(employeesQuery).all();

    // Ensure we always return an array
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
        id, name, email, position, department, 
        workgroup_code AS workgroupId, 
        active, joined_date, created_at, updated_at
      FROM employees
      WHERE id = ?
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
  const { name, email, position, department, workgroup_code, joined_date } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required fields" });
  }

  try {
    const newId = generateEmployeeId();
    
    // Check if employee with this email already exists
    const existing = db.prepare("SELECT id FROM employees WHERE email = ?").get(email);
    if (existing) {
        return res.status(409).json({ error: "Employee with this email already exists" });
    }

    const insertEmployee = db.prepare(`
      INSERT INTO employees 
        (id, name, email, position, department, workgroup_code, joined_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertEmployee.run(
      newId, 
      name, 
      email, 
      position || null, 
      department || null, 
      workgroup_code || null, 
      joined_date || null
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
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { name, email, position, department, workgroup_code, active, joined_date } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required fields" });
  }

  try {
    // Check if the new email belongs to another employee
    const emailConflict = db.prepare("SELECT id FROM employees WHERE email = ? AND id != ?").get(email, id);
    if (emailConflict) {
        return res.status(409).json({ error: "This email address is already in use by another employee" });
    }

    const updateEmployee = db.prepare(`
      UPDATE employees
      SET 
        name = ?, 
        email = ?, 
        position = ?, 
        department = ?, 
        workgroup_code = ?, 
        active = ?, 
        joined_date = ?
      WHERE id = ?
    `);
    
    // Convert boolean-like 'active' to integer 1 or 0 for SQLite
    const activeValue = typeof active === 'boolean' ? (active ? 1 : 0) : active;

    const result = updateEmployee.run(
      name, 
      email, 
      position || null, 
      department || null, 
      workgroup_code || null, 
      activeValue, 
      joined_date || null,
      id
    );

    if (result.changes === 0) {
      // Check if employee exists before assuming no changes were made
      const checkExists = db.prepare("SELECT id FROM employees WHERE id = ?").get(id);
      if (!checkExists) {
        return res.status(404).json({ error: "Employee not found" });
      }
      return res.status(200).json({ message: "Employee updated successfully (or no changes made)" });
    }

    res.json({ message: "Employee updated successfully" });
  } catch (err) {
    console.error("Error updating employee:", err);
    res.status(500).json({ error: "Failed to update employee" });
  }
});

module.exports = router;
