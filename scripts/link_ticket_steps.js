// scripts/link_ticket_steps.js
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.argv[2] || './liteboard.db';
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

console.log('Linking tickets to workflow_steps...');

// 1️⃣ Fetch all workflow steps
const steps = db.prepare(`
  SELECT workflow_id, step_code, step_name, step_order
  FROM workflow_steps
`).all();

// 2️⃣ Fetch all tickets without a step_code
const tickets = db.prepare(`
  SELECT id, workflow_id, status
  FROM tickets
  WHERE step_code IS NULL
`).all();

const updateStmt = db.prepare(`
  UPDATE tickets
  SET step_code = ?
  WHERE id = ?
`);

let updatedCount = 0;

const transaction = db.transaction(() => {
  tickets.forEach(ticket => {
    const { id, workflow_id, status } = ticket;

    // Try to match workflow step by name = ticket.status (case-insensitive)
    let step = steps.find(s => 
      s.workflow_id === workflow_id &&
      s.step_name.toLowerCase() === (status || '').toLowerCase()
    );

    // Fallback: if exact match not found, use first step in workflow
    if (!step) {
      step = steps.find(s => s.workflow_id === workflow_id && s.step_order === 1);
      if (step) {
        console.log(`⚠ No exact match for ticket ${id} (${status || 'NULL'}), using first step: ${step.step_name}`);
      } else {
        console.log(`✗ No workflow steps found for ticket ${id} with workflow ${workflow_id}, skipping`);
        return; // skip this ticket
      }
    }

    // Update ticket with step_code
    updateStmt.run(step.step_code, id);
    updatedCount++;
    console.log(`✓ Ticket ${id} → step_code: ${step.step_code}`);
  });
});

transaction();
console.log(`\n✅ Successfully updated ${updatedCount} tickets.`);

db.close();
