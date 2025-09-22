const Database = require('better-sqlite3');

class TicketResponsibleUpdater {
  constructor(dbPath) {
    this.db = new Database(dbPath);
    this.db.pragma('foreign_keys = ON');
    
    // Prepare update statement
    this.updateStatement = this.db.prepare(`
      UPDATE tickets 
      SET responsible_employee_id = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    
    // Prepare validation statements
    this.employeeExists = this.db.prepare('SELECT 1 FROM employees WHERE id = ?');
    this.ticketExists = this.db.prepare('SELECT 1 FROM tickets WHERE id = ?');
  }

  validateEmployee(employeeId) {
    return this.employeeExists.get(employeeId) !== undefined;
  }

  validateTicket(ticketId) {
    return this.ticketExists.get(ticketId) !== undefined;
  }

  updateTickets(ticketAssignments) {
    console.log('Starting ticket responsible employee updates...\n');
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Start transaction
    const transaction = this.db.transaction(() => {
      for (const assignment of ticketAssignments) {
        const { ticketId, employeeId } = assignment;
        
        try {
          // Validate ticket exists
          if (!this.validateTicket(ticketId)) {
            throw new Error(`Ticket ${ticketId} not found`);
          }
          
          // Validate employee exists (if employeeId is provided)
          if (employeeId && !this.validateEmployee(employeeId)) {
            throw new Error(`Employee ${employeeId} not found`);
          }
          
          // Update the ticket
          const result = this.updateStatement.run(employeeId || null, ticketId);
          
          if (result.changes > 0) {
            console.log(`✓ Updated ${ticketId} → ${employeeId || 'NULL'}`);
            successCount++;
          } else {
            console.log(`⚠ No changes made for ${ticketId}`);
          }
          
        } catch (error) {
          console.error(`✗ Error updating ${ticketId}: ${error.message}`);
          errors.push({ ticketId, employeeId, error: error.message });
          errorCount++;
        }
      }
    });

    // Execute transaction
    transaction();

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Successfully updated: ${successCount} tickets`);
    console.log(`❌ Failed updates: ${errorCount} tickets`);
    
    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach(err => {
        console.log(`  ${err.ticketId} → ${err.employeeId}: ${err.error}`);
      });
    }

    this.db.close();
  }

  // Helper method to list all employees
  listEmployees() {
    const employees = this.db.prepare('SELECT id, name FROM employees ORDER BY id').all();
    console.log('\nAvailable Employees:');
    console.log('='.repeat(30));
    employees.forEach(emp => {
      console.log(`${emp.id} - ${emp.name}`);
    });
    return employees;
  }

  // Helper method to list all tickets
  listTickets() {
    const tickets = this.db.prepare('SELECT id, title, responsible_employee_id FROM tickets ORDER BY id').all();
    console.log('\nCurrent Tickets:');
    console.log('='.repeat(50));
    tickets.forEach(ticket => {
      console.log(`${ticket.id} - ${ticket.title} (Currently: ${ticket.responsible_employee_id || 'Unassigned'})`);
    });
    return tickets;
  }
}

// Main execution
function main() {
  const dbPath = process.argv[2] || './liteboard.db';
  
  if (!require('fs').existsSync(dbPath)) {
    console.error(`❌ Database file not found: ${dbPath}`);
    process.exit(1);
  }

  const updater = new TicketResponsibleUpdater(dbPath);

  // ===== CONFIGURATION SECTION =====
  // Add your ticket assignments here in the format:
  // { ticketId: 'TCK-XXXX', employeeId: 'EMP-XXX' }
  // Use null or omit employeeId to unassign a ticket
  
  const ticketAssignments = [
    // Example assignments - REPLACE WITH YOUR ACTUAL DATA:
    { ticketId: 'TCK-1001', employeeId: 'EMP-003' },
    { ticketId: 'TCK-1002', employeeId: 'EMP-003' },
    { ticketId: 'TCK-1003', employeeId: 'EMP-003' },
    { ticketId: 'TCK-1004', employeeId: 'EMP-006' },
    { ticketId: 'TCK-1005', employeeId: 'EMP-005' },
    { ticketId: 'TCK-1006', employeeId: 'EMP-001' },
    { ticketId: 'TCK-1007', employeeId: 'EMP-004' },
    { ticketId: 'TCK-1008', employeeId: 'EMP-005' },
    { ticketId: 'TCK-1009', employeeId: 'EMP-004' },
    { ticketId: 'TCK-1010', employeeId: 'EMP-001' },
    { ticketId: 'TCK-1011', employeeId: 'EMP-004' },
    { ticketId: 'TCK-1012', employeeId: 'EMP-005' },
    { ticketId: 'TCK-1013', employeeId: 'EMP-001' },
    { ticketId: 'TCK-1014', employeeId: 'EMP-004' },
    { ticketId: 'TCK-1015', employeeId: 'EMP-001' },
    { ticketId: 'TCK-1016', employeeId: 'EMP-006' },
    { ticketId: 'TCK-1017', employeeId: 'EMP-006' },
    { ticketId: 'TCK-1018', employeeId: 'EMP-001' },
    { ticketId: 'TCK-1019', employeeId: 'EMP-001' },
    { ticketId: 'TCK-1020', employeeId: 'EMP-001' },
    { ticketId: 'TCK-1021', employeeId: 'EMP-001' },
    { ticketId: 'TCK-1022', employeeId: 'EMP-006' },
    { ticketId: 'TCK-1023', employeeId: 'EMP-002' },

    
   
  ];


  // Validate we have assignments to process
  if (ticketAssignments.length === 0) {
    console.log('⚠ No ticket assignments configured.');
    console.log('Please edit the script and add your ticket assignments in the ticketAssignments array.');
    updater.listEmployees();
    updater.listTickets();
    return;
  }

  // Execute the updates
  updater.updateTickets(ticketAssignments);
}

if (require.main === module) {
  main();
}

module.exports = TicketResponsibleUpdater;