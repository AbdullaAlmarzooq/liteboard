// For React projects, you might need to install better-sqlite3
// Run: npm install better-sqlite3
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

class LiteBoardMigration {
  constructor(dbPath, jsonPath) {
    this.db = new Database(dbPath);
    this.jsonPath = jsonPath;
    this.stats = {};
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
    
    // Prepare all insert statements
    this.prepareStatements();
  }

  prepareStatements() {
    this.statements = {
      workgroups: this.db.prepare(`
        INSERT OR IGNORE INTO workgroups (id, name, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `),
      
      employees: this.db.prepare(`
        INSERT OR IGNORE INTO employees (id, name, email, position, department, workgroup_code, active, joined_date, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `),
      
      employee_skills: this.db.prepare(`
        INSERT OR IGNORE INTO employee_skills (employee_id, skill, created_at)
        VALUES (?, ?, ?)
      `),
      
      workflows: this.db.prepare(`
        INSERT OR IGNORE INTO workflows (id, name, description, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `),
      
      workflow_steps: this.db.prepare(`
        INSERT OR IGNORE INTO workflow_steps (workflow_id, step_code, step_name, workgroup_code, step_order, category_code, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `),
      
      modules: this.db.prepare(`
        INSERT OR IGNORE INTO modules (id, name, description, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `),
      
      tags: this.db.prepare(`
        INSERT OR IGNORE INTO tags (id, label, color, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `),
      
      tickets: this.db.prepare(`
        INSERT OR IGNORE INTO tickets (id, title, description, status, priority, workflow_id, step_code, workgroup_id, responsible_employee_id, module, start_date, due_date, initiate_date, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `),
      
      ticket_tags: this.db.prepare(`
        INSERT OR IGNORE INTO ticket_tags (ticket_id, tag_id, created_at)
        VALUES (?, ?, ?)
      `),
      
      comments: this.db.prepare(`
        INSERT OR IGNORE INTO comments (id, ticket_id, text, author, comment_type, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `),
      
      attachments: this.db.prepare(`
        INSERT OR IGNORE INTO attachments (ticket_id, filename, file_type, file_size, file_data, uploaded_at, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `),
      
      status_history: this.db.prepare(`
        INSERT OR IGNORE INTO status_history (id, ticket_id, activity_type, field_name, old_value, new_value, timestamp, changed_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
    };
  }

  loadJsonData() {
    console.log(`Loading data from ${this.jsonPath}...`);
    const jsonData = fs.readFileSync(this.jsonPath, 'utf8');
    return JSON.parse(jsonData);
  }

  safeValue(value, defaultValue = null) {
    return value !== undefined && value !== null && value !== '' ? value : defaultValue;
  }

  getCurrentTimestamp() {
    return new Date().toISOString();
  }

  // Check if a workgroup exists
  workgroupExists(workgroupId) {
    if (!workgroupId) return false;
    const result = this.db.prepare('SELECT 1 FROM workgroups WHERE id = ?').get(workgroupId);
    return !!result;
  }

  // Check if an employee exists
  employeeExists(employeeId) {
    if (!employeeId) return false;
    const result = this.db.prepare('SELECT 1 FROM employees WHERE id = ?').get(employeeId);
    return !!result;
  }

  // Check if a workflow step exists
  workflowStepExists(stepCode) {
    if (!stepCode) return false;
    const result = this.db.prepare('SELECT 1 FROM workflow_steps WHERE step_code = ?').get(stepCode);
    return !!result;
  }

  insertWorkgroups(workgroups) {
    console.log('Inserting workgroups...');
    let count = 0;
    const timestamp = this.getCurrentTimestamp();
    
    for (const workgroup of workgroups) {
      try {
        this.statements.workgroups.run(
          workgroup.id,
          workgroup.name,
          this.safeValue(workgroup.description),
          timestamp,
          timestamp
        );
        count++;
      } catch (error) {
        console.error(`Error inserting workgroup ${workgroup.id}:`, error.message);
      }
    }
    
    this.stats.workgroups = count;
    console.log(`✓ Inserted ${count} workgroups`);
  }

  insertEmployees(employees) {
    console.log('Inserting employees...');
    let count = 0;
    let skillCount = 0;
    const timestamp = this.getCurrentTimestamp();
    
    for (const employee of employees) {
      try {
        // Map the workgroup field correctly
        let workgroupCode = this.safeValue(employee.workgroupCode);
        if (!workgroupCode && employee.workGroup) {
          workgroupCode = employee.workGroup;
        }
        
        // Validate workgroup exists if provided
        if (workgroupCode && !this.workgroupExists(workgroupCode)) {
          console.warn(`Workgroup ${workgroupCode} not found for employee ${employee.id}, setting to null`);
          workgroupCode = null;
        }
        
        this.statements.employees.run(
          employee.id,
          employee.name,
          employee.email,
          this.safeValue(employee.position),
          this.safeValue(employee.department),
          workgroupCode,
          employee.active ? 1 : 0,
          this.safeValue(employee.joined_date),
          timestamp,
          timestamp
        );
        count++;
        
        // Insert employee skills
        if (employee.skills && Array.isArray(employee.skills)) {
          for (const skill of employee.skills) {
            try {
              this.statements.employee_skills.run(
                employee.id,
                skill,
                timestamp
              );
              skillCount++;
            } catch (error) {
              console.error(`Error inserting skill for employee ${employee.id}:`, error.message);
            }
          }
        }
      } catch (error) {
        console.error(`Error inserting employee ${employee.id}:`, error.message);
      }
    }
    
    this.stats.employees = count;
    this.stats.employee_skills = skillCount;
    console.log(`✓ Inserted ${count} employees and ${skillCount} skills`);
  }

  insertWorkflows(workflows) {
    console.log('Inserting workflows...');
    let workflowCount = 0;
    let stepCount = 0;
    const timestamp = this.getCurrentTimestamp();
    
    for (const workflow of workflows) {
      try {
        // Insert workflow
        this.statements.workflows.run(
          workflow.id,
          workflow.name,
          this.safeValue(workflow.description),
          1, // active
          timestamp,
          timestamp
        );
        workflowCount++;
        
        // Insert workflow steps
        if (workflow.steps && Array.isArray(workflow.steps)) {
          for (const step of workflow.steps) {
            try {
              // Validate workgroup exists
              let workgroupCode = step.workgroupCode;
              if (workgroupCode && !this.workgroupExists(workgroupCode)) {
                console.warn(`Workgroup ${workgroupCode} not found for step ${step.stepCode}, setting to null`);
                workgroupCode = null;
              }
              
              this.statements.workflow_steps.run(
                workflow.id,
                step.stepCode,
                step.stepName,
                workgroupCode,
                step.order,
                step.categoryCode,
                timestamp
              );
              stepCount++;
            } catch (error) {
              console.error(`Error inserting workflow step ${step.stepCode}:`, error.message);
            }
          }
        }
      } catch (error) {
        console.error(`Error inserting workflow ${workflow.id}:`, error.message);
      }
    }
    
    this.stats.workflows = workflowCount;
    this.stats.workflow_steps = stepCount;
    console.log(`✓ Inserted ${workflowCount} workflows and ${stepCount} workflow steps`);
  }

  insertModules(modules) {
    console.log('Inserting modules...');
    let count = 0;
    const timestamp = this.getCurrentTimestamp();
    
    for (const module of modules) {
      try {
        this.statements.modules.run(
          module.id,
          module.name,
          this.safeValue(module.description),
          1, // active
          timestamp,
          timestamp
        );
        count++;
      } catch (error) {
        console.error(`Error inserting module ${module.id}:`, error.message);
      }
    }
    
    this.stats.modules = count;
    console.log(`✓ Inserted ${count} modules`);
  }

  insertTags(tags) {
    console.log('Inserting tags...');
    let count = 0;
    const timestamp = this.getCurrentTimestamp();
    
    for (const tag of tags) {
      try {
        this.statements.tags.run(
          tag.id,
          tag.label,
          this.safeValue(tag.color),
          timestamp,
          timestamp
        );
        count++;
      } catch (error) {
        console.error(`Error inserting tag ${tag.id}:`, error.message);
      }
    }
    
    this.stats.tags = count;
    console.log(`✓ Inserted ${count} tags`);
  }

  insertTickets(tickets, tags) {
    console.log('Inserting tickets...');
    let ticketCount = 0;
    let commentCount = 0;
    let attachmentCount = 0;
    let ticketTagCount = 0;
    const timestamp = this.getCurrentTimestamp();
    
    // Create a tag lookup map
    const tagLookup = {};
    for (const tag of tags) {
      tagLookup[tag.label] = tag.id;
    }
    
    for (const ticket of tickets) {
      try {
        // Map JSON field names to database field names with validation
        let responsibleEmployee = this.safeValue(ticket.responsible);
        let workgroupId = this.safeValue(ticket.workgroupId);
        
        // Handle alternative field names
        if (!workgroupId && ticket.workGroup) {
          workgroupId = ticket.workGroup;
        }
        
        // Validate foreign key references
        if (responsibleEmployee && !this.employeeExists(responsibleEmployee)) {
          console.warn(`Employee ${responsibleEmployee} not found for ticket ${ticket.id}, setting to null`);
          responsibleEmployee = null;
        }
        
        if (workgroupId && !this.workgroupExists(workgroupId)) {
          console.warn(`Workgroup ${workgroupId} not found for ticket ${ticket.id}, setting to null`);
          workgroupId = null;
        }
        
        let stepCode = this.safeValue(ticket.stepCode);
        if (stepCode && !this.workflowStepExists(stepCode)) {
          console.warn(`Step code ${stepCode} not found for ticket ${ticket.id}, setting to null`);
          stepCode = null;
        }
        
        // Insert ticket
        this.statements.tickets.run(
          ticket.id,
          ticket.title,
          this.safeValue(ticket.description),
          this.safeValue(ticket.status, 'Open'),
          this.safeValue(ticket.priority, 'Medium'),
          this.safeValue(ticket.workflowId),
          stepCode,
          workgroupId,
          responsibleEmployee,
          this.safeValue(ticket.module),
          this.safeValue(ticket.startDate),
          this.safeValue(ticket.dueDate),
          ticket.initiateDate || timestamp,
          timestamp,
          timestamp
        );
        ticketCount++;
        
        // Insert ticket tags
        if (ticket.tags && Array.isArray(ticket.tags)) {
          for (const tagLabel of ticket.tags) {
            const tagId = tagLookup[tagLabel];
            if (tagId) {
              try {
                this.statements.ticket_tags.run(
                  ticket.id,
                  tagId,
                  timestamp
                );
                ticketTagCount++;
              } catch (error) {
                console.error(`Error inserting ticket tag ${tagLabel} for ticket ${ticket.id}:`, error.message);
              }
            } else {
              console.warn(`Tag '${tagLabel}' not found in tags table for ticket ${ticket.id}`);
            }
          }
        }
        
        // Insert comments
        if (ticket.comments && Array.isArray(ticket.comments)) {
          for (const comment of ticket.comments) {
            try {
              this.statements.comments.run(
                comment.id,
                ticket.id,
                comment.text,
                comment.author,
                this.safeValue(comment.type, 'comment'),
                comment.timestamp || timestamp
              );
              commentCount++;
            } catch (error) {
              console.error(`Error inserting comment ${comment.id}:`, error.message);
            }
          }
        }
        
        // Insert attachments
        if (ticket.attachments && Array.isArray(ticket.attachments)) {
          for (const attachment of ticket.attachments) {
            try {
              // Decode base64 data if present
              let fileData = null;
              if (attachment.data && attachment.data.startsWith('data:')) {
                const base64Data = attachment.data.split(',')[1];
                fileData = Buffer.from(base64Data, 'base64');
              }
              
              this.statements.attachments.run(
                ticket.id,
                attachment.name,
                this.safeValue(attachment.type),
                this.safeValue(attachment.size),
                fileData,
                timestamp,
                'System Migration'
              );
              attachmentCount++;
            } catch (error) {
              console.error(`Error inserting attachment ${attachment.name} for ticket ${ticket.id}:`, error.message);
            }
          }
        }
      } catch (error) {
        console.error(`Error inserting ticket ${ticket.id}:`, error.message);
        console.error('Ticket data:', JSON.stringify(ticket, null, 2));
      }
    }
    
    this.stats.tickets = ticketCount;
    this.stats.comments = commentCount;
    this.stats.attachments = attachmentCount;
    this.stats.ticket_tags = ticketTagCount;
    console.log(`✓ Inserted ${ticketCount} tickets, ${commentCount} comments, ${attachmentCount} attachments, ${ticketTagCount} ticket tags`);
  }

  insertStatusHistory(statusHistory) {
    console.log('Inserting status history...');
    let count = 0;
    
    for (const history of statusHistory) {
      try {
        // Validate ticket exists if ticketId is provided
        let ticketId = this.safeValue(history.ticketId);
        if (ticketId) {
          const ticketExists = this.db.prepare('SELECT 1 FROM tickets WHERE id = ?').get(ticketId);
          if (!ticketExists) {
            console.warn(`Ticket ${ticketId} not found for status history ${history.id}, setting to null`);
            ticketId = null;
          }
        }
        
        this.statements.status_history.run(
          history.id,
          ticketId,
          history.type,
          this.safeValue(history.fieldName),
          this.safeValue(history.oldValue),
          this.safeValue(history.newValue),
          history.timestamp,
          history.changedBy
        );
        count++;
      } catch (error) {
        console.error(`Error inserting status history ${history.id}:`, error.message);
      }
    }
    
    this.stats.status_history = count;
    console.log(`✓ Inserted ${count} status history records`);
  }

  async migrate() {
    console.log('Starting LiteBoard data migration...\n');
    
    try {
      // Load JSON data
      const data = this.loadJsonData();
      
      // Start transaction
      const transaction = this.db.transaction(() => {
        // Insert in order to respect foreign key constraints
        this.insertWorkgroups(data.workgroups || []);
        this.insertEmployees(data.employees || []);
        this.insertWorkflows(data.workflows || []);
        this.insertModules(data.modules || []);
        this.insertTags(data.tags || []);
        this.insertTickets(data.tickets || [], data.tags || []);
        this.insertStatusHistory(data.status_history || []);
      });
      
      // Execute transaction
      transaction();
      
      console.log('\n🎉 Migration completed successfully!');
      console.log('\nMigration Statistics:');
      console.log('====================');
      
      for (const [table, count] of Object.entries(this.stats)) {
        console.log(`${table.padEnd(15)}: ${count} records`);
      }
      
      // Verify foreign key integrity
      console.log('\n🔍 Verifying foreign key integrity...');
      const integrityCheck = this.db.pragma('integrity_check');
      if (integrityCheck[0].integrity_check === 'ok') {
        console.log('✅ Database integrity check passed');
      } else {
        console.log('❌ Database integrity check failed:', integrityCheck);
      }
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      this.db.close();
    }
  }
}

// Main execution
async function main() {
  const dbPath = process.argv[2] || './liteboard.db';
  const jsonPath = process.argv[3] || './db.json';
  
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Database file not found: ${dbPath}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ JSON file not found: ${jsonPath}`);
    process.exit(1);
  }
  
  console.log(`Database: ${dbPath}`);
  console.log(`JSON Data: ${jsonPath}\n`);
  
  const migration = new LiteBoardMigration(dbPath, jsonPath);
  
  try {
    await migration.migrate();
    console.log('\n✅ All done! Your data has been successfully migrated to SQLite.');
  } catch (error) {
    console.error('\n❌ Migration failed. Please check the errors above and try again.');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = LiteBoardMigration;