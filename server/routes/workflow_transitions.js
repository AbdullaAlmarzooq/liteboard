// server/routes/workflow_transitions.js
const express = require('express');
const router = express.Router();
const db = require('../db/db');

// ------------------------
// GET all transitions (optionally by workflow_id)
// ------------------------
router.get('/', async (req, res) => {
  const { workflow_id } = req.query;

  try {
    let query = 'SELECT * FROM workflow_transitions';
    let params = [];

    if (workflow_id) {
      query += ' WHERE workflow_id = $1';
      params.push(workflow_id);
    }

    const { rows } = await db.query(query, params);
    res.json(rows);
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
    const { rows } = await db.query(
      'SELECT * FROM workflow_transitions WHERE from_step_code = $1',
      [step_code]
    );
    res.json(rows);
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
    await db.query(
      `UPDATE workflow_transitions 
       SET from_step_code = $1, to_step_code = $2, workflow_id = $3, cancel_allowed = $4 
       WHERE id = $5`,
      [from_step_code, to_step_code, workflow_id, !!cancel_allowed, id]
    );

    const { rows } = await db.query('SELECT * FROM workflow_transitions WHERE id = $1', [id]);
    res.json(rows[0]);
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
    const result = await db.query(
      `INSERT INTO workflow_transitions (workflow_id, from_step_code, to_step_code, cancel_allowed)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [workflow_id, from_step_code, to_step_code, !!cancel_allowed]
    );

    const { rows } = await db.query('SELECT * FROM workflow_transitions WHERE id = $1', [result.rows[0].id]);
    res.json(rows[0]);
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
    await db.query('DELETE FROM workflow_transitions WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete transition' });
  }
});

module.exports = router;
