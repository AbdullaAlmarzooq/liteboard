const fs = require('fs');
const path = require('path');

// Auto-detect db.json in the same folder as this script
const dbPath = path.join(__dirname, 'db.json');

if (!fs.existsSync(dbPath)) {
  console.error('db.json not found in this folder!');
  process.exit(1);
}

// Load database
const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

// Build workgroup name -> id map
const workgroupMap = {};
if (db.workgroups && Array.isArray(db.workgroups)) {
  db.workgroups.forEach(wg => {
    workgroupMap[wg.name] = wg.id;
  });
} else {
  console.error('No workgroups found in db.json');
  process.exit(1);
}

// Update tickets
if (db.tickets && Array.isArray(db.tickets)) {
  db.tickets = db.tickets.map(ticket => {
    const workGroupName = ticket.workGroup;
    if (workGroupName && workgroupMap[workGroupName]) {
      ticket.workgroupId = workgroupMap[workGroupName]; // store ID
      delete ticket.workGroup; // remove old string
    } else {
      ticket.workgroupId = null; // fallback
    }
    return ticket;
  });

  // Save back
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  console.log('✅ Tickets updated with workgroupId!');
} else {
  console.log('No tickets found to update.');
}