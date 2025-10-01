// server/routes/workflow_transitions.js
const express = require('express');
const router = express.Router();
const db = require('../db/db'); // make sure this exports your SQLite connection

// ------------------------
// GET all transitions (optionally by workflow_id)
// ------------------------
router.get('/', async (req, res) => {
  const { workflow_id } = req.query;

  try {
    let query = 'SELECT * FROM workflow_transitions';
    let params = [];

    if (workflow_id) {
      query += ' WHERE workflow_id = ?';
      params.push(workflow_id);
    }

    const transitions = await db.all(query, params);
    res.json(transitions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch workflow transitions' });
  }
});

// ------------------------
// GET transitions for a specific workflow step
// ------------------------
router.get('/step/:step_code', async (req, res) => {
  const { step_code } = req.params;
  try {
    const transitions = await db.all(
      'SELECT * FROM workflow_transitions WHERE from_step_code = ?',
      [step_code]
    );
    res.json(transitions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch transitions for step' });
  }
});

// ------------------------
// PUT update a transition (for Admin Panel)
// ------------------------
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { from_step_code, to_step_code, workflow_id, cancel_allowed } = req.body;

  try {
    await db.run(
      `UPDATE workflow_transitions 
       SET from_step_code = ?, to_step_code = ?, workflow_id = ?, cancel_allowed = ? 
       WHERE id = ?`,
      [from_step_code, to_step_code, workflow_id, cancel_allowed ? 1 : 0, id]
    );

    const updated = await db.get('SELECT * FROM workflow_transitions WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update transition' });
  }
});

// ------------------------
// POST create a new transition (optional, Admin Panel)
// ------------------------
router.post('/', async (req, res) => {
  const { from_step_code, to_step_code, workflow_id, cancel_allowed } = req.body;

  try {
    const result = await db.run(
      `INSERT INTO workflow_transitions (workflow_id, from_step_code, to_step_code, cancel_allowed)
       VALUES (?, ?, ?, ?)`,
      [workflow_id, from_step_code, to_step_code, cancel_allowed ? 1 : 0]
    );

    const newTransition = await db.get('SELECT * FROM workflow_transitions WHERE id = ?', [result.lastID]);
    res.json(newTransition);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create transition' });
  }
});

// ------------------------
// DELETE a transition (optional, Admin Panel)
// ------------------------
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await db.run('DELETE FROM workflow_transitions WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete transition' });
  }
});

module.exports = router;