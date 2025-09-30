const express = require("express");
const db = require("../db/db");
const router = express.Router();
const crypto = require("crypto");

// Helper to generate sequential MOD-xxx ID
const generateModuleId = () => {
  try {

    const result = db.prepare(`
      SELECT id FROM modules 
      WHERE id LIKE 'MOD-%' 
      ORDER BY id DESC 
      LIMIT 1
    `).get();

    if (result) {

      const parts = result.id.split('-');
      if (parts.length === 2) {
          const currentNum = parseInt(parts[1]);
          if (!isNaN(currentNum)) {
            const nextNum = currentNum + 1;

            return `MOD-${String(nextNum).padStart(3, '0')}`;
          }
      }
    }

    return 'MOD-001';
  } catch (err) {
    console.error('Error generating sequential Module ID:', err);

    return `MOD-${String(Date.now()).slice(-4)}`; 
  }
};

// ----------------------------------------------------------------------
// GET all active modules (for dropdowns/lists)
// ----------------------------------------------------------------------
router.get("/", (req, res) => {
  try {
    const modulesQuery = `
      SELECT 
        id, 
        name, 
        description, 
        active, 
        created_at, 
        updated_at
      FROM modules
      WHERE active = 1
      ORDER BY name ASC
    `;
    const rows = db.prepare(modulesQuery).all();

    res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error("Error fetching modules:", err);
    res.status(500).json({ error: "Failed to fetch modules" });
  }
});

// ----------------------------------------------------------------------
// GET module by ID (useful for editing)
// ----------------------------------------------------------------------
router.get("/:id", (req, res) => {
  const { id } = req.params;
  try {
    const moduleQuery = `
      SELECT 
        id, name, description, active, created_at, updated_at
      FROM modules
      WHERE id = ?
    `;
    const module = db.prepare(moduleQuery).get(id);

    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }

    res.json(module);
  } catch (err) {
    console.error("Error fetching module:", err);
    res.status(500).json({ error: "Failed to fetch module" });
  }
});

// ----------------------------------------------------------------------
// POST create a new module
// ----------------------------------------------------------------------
router.post("/", (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Module name is required" });
  }

  try {
    const newId = generateModuleId();
    
    // Optional: Check if module with this name already exists (assuming name should be unique)
    const existing = db.prepare("SELECT id FROM modules WHERE name = ? COLLATE NOCASE").get(name);
    if (existing) {
        return res.status(409).json({ error: "A module with this name already exists" });
    }

    const insertModule = db.prepare(`
      INSERT INTO modules 
        (id, name, description)
      VALUES (?, ?, ?)
    `);

    insertModule.run(
      newId, 
      name, 
      description || null
    );

    res.status(201).json({ message: "Module created successfully", id: newId });
  } catch (err) {
    console.error("Error creating module:", err);
    res.status(500).json({ error: "Failed to create module" });
  }
});

// ----------------------------------------------------------------------
// PUT update an existing module
// ----------------------------------------------------------------------
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { name, description, active } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Module name is required" });
  }

  try {
    // Check if the new name belongs to another module
    const nameConflict = db.prepare("SELECT id FROM modules WHERE name = ? COLLATE NOCASE AND id != ?").get(name, id);
    if (nameConflict) {
        return res.status(409).json({ error: "This module name is already in use by another module" });
    }

    const updateModule = db.prepare(`
      UPDATE modules
      SET 
        name = ?, 
        description = ?, 
        active = ?
      WHERE id = ?
    `);
    

    const activeValue = typeof active === 'boolean' ? (active ? 1 : 0) : active;

    const result = updateModule.run(
      name, 
      description || null, 

      active === undefined || active === null ? 1 : activeValue,
      id
    );

    if (result.changes === 0) {

      const checkExists = db.prepare("SELECT id FROM modules WHERE id = ?").get(id);
      if (!checkExists) {
        return res.status(404).json({ error: "Module not found" });
      }
      return res.status(200).json({ message: "Module updated successfully (or no changes made)" });
    }

    res.json({ message: "Module updated successfully" });
  } catch (err) {
    console.error("Error updating module:", err);
    res.status(500).json({ error: "Failed to update module" });
  }
});

module.exports = router;
