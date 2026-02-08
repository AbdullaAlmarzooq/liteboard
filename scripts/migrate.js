#!/usr/bin/env node

/**
 * LiteBoard SQLite → PostgreSQL Migration Script
 * 
 * This script migrates data from SQLite to PostgreSQL (Neon),
 * handling UUID generation, relationship mapping, and data transformation.
 * 
 * Prerequisites:
 * - Node.js 18+
 * - npm install pg better-sqlite3 uuid
 * - Set NEON_PASSWORD environment variable
 * - SQLite database at ./server/db/liteboard.db
 * 
 * Usage:
 *   export NEON_PASSWORD="your_password_here"
 *   export DRY_RUN=true  # Optional: test run without actually inserting
 *   node migrate.js
 */

const Database = require('better-sqlite3');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Configuration
const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || '../server/db/liteboard.db';
const DRY_RUN = process.env.DRY_RUN === 'true';

// Neon PostgreSQL Configuration
const NEON_CONFIG = {
  host: 'ep-muddy-sky-aijtz43a-pooler.c-4.us-east-1.aws.neon.tech',
  database: 'neondb',
  user: 'neondb_owner',
  password: process.env.NEON_PASSWORD,
  port: 5432,
  ssl: { 
    rejectUnauthorized: false 
  },
  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// Validate required environment variables
if (!NEON_CONFIG.password) {
  console.error('❌ ERROR: NEON_PASSWORD environment variable not set');
  console.error('\nUsage:');
  console.error('  export NEON_PASSWORD="your_password_here"');
  console.error('  node migrate.js');
  process.exit(1);
}

if (!fs.existsSync(SQLITE_DB_PATH)) {
  console.error(`❌ ERROR: SQLite database not found at ${SQLITE_DB_PATH}`);
  process.exit(1);
}

// Initialize connections
const sqlite = new Database(SQLITE_DB_PATH, { readonly: true });
const pool = new Pool(NEON_CONFIG);

// ID mappings: oldId → newUUID
const idMappings = {
  workgroups: {},
  employees: {},
  workflows: {},
  workflow_steps: {},
  modules: {},
  tags: {},
  tickets: {}
};

// Statistics
const stats = {
  workgroups: { exported: 0, imported: 0 },
  employees: { exported: 0, imported: 0 },
  workflows: { exported: 0, imported: 0 },
  workflow_steps: { exported: 0, imported: 0 },
  modules: { exported: 0, imported: 0 },
  tags: { exported: 0, imported: 0 },
  tickets: { exported: 0, imported: 0 },
  ticket_tags: { exported: 0, imported: 0 },
  comments: { exported: 0, imported: 0 },
  attachments: { exported: 0, imported: 0, skipped: 0 },
  status_history: { exported: 0, imported: 0 }
};

// Helper functions
function generateUUID() {
  return uuidv4();
}

function convertBoolean(value) {
  return value === 1 || value === '1' || value === true;
}

function convertTimestamp(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function normalizeDate(value) {
  if (!value) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
}

function normalizeTicketStatus(status) {
  if (!status) return 'Open';
  const normalized = status.trim();
  const mapping = {
    'Pending confirmation': 'Pending',
    'To be review': 'Pending',
    'IGA': 'Pending',
    'RT': 'Pending'
  };
  return mapping[normalized] || normalized;
}

// Export functions
async function exportWorkgroups() {
  console.log('\n📦 Exporting workgroups...');
  const rows = sqlite.prepare('SELECT * FROM workgroups').all();
  stats.workgroups.exported = rows.length;
  
  return rows.map(row => {
    const newId = generateUUID();
    idMappings.workgroups[row.id] = newId;
    
    return {
      id: newId,
      ticket_code: row.id,
      name: row.name,
      description: row.description,
      active: true,  // Add missing field
      created_at: convertTimestamp(row.created_at) || new Date().toISOString(),
      updated_at: convertTimestamp(row.updated_at) || new Date().toISOString(),
      deleted_at: null
    };
  });
}

async function exportEmployees() {
  console.log('\n📦 Exporting employees...');
  const rows = sqlite.prepare('SELECT * FROM employees').all();
  stats.employees.exported = rows.length;
  
  return rows.map(row => {
    const newId = generateUUID();
    idMappings.employees[row.id] = newId;
    
    return {
      id: newId,
      name: row.name,
      email: row.email,
      password_hash: row.password_hash || row.password,  // Handle column variations
      position: row.position,
      department: row.department,
      role_id: parseInt(row.role_id) || 3,  // Default to Viewer
      workgroup_id: row.workgroup_code ? idMappings.workgroups[row.workgroup_code] : null,
      active: convertBoolean(row.active),
      joined_date: row.joined_date,
      last_login_at: null,  // New field
      created_at: convertTimestamp(row.created_at) || new Date().toISOString(),
      updated_at: convertTimestamp(row.updated_at) || new Date().toISOString(),
      deleted_at: null
    };
  });
}

async function exportWorkflows() {
  console.log('\n📦 Exporting workflows...');
  const rows = sqlite.prepare('SELECT * FROM workflows').all();
  stats.workflows.exported = rows.length;
  
  return rows.map(row => {
    const newId = generateUUID();
    idMappings.workflows[row.id] = newId;
    
    return {
      id: newId,
      name: row.name,
      description: row.description,
      active: convertBoolean(row.active),
      created_at: convertTimestamp(row.created_at) || new Date().toISOString(),
      updated_at: convertTimestamp(row.updated_at) || new Date().toISOString(),
      deleted_at: null
    };
  });
}

async function exportWorkflowSteps() {
  console.log('\n📦 Exporting workflow steps...');
  const rows = sqlite.prepare('SELECT * FROM workflow_steps').all();
  stats.workflow_steps.exported = rows.length;
  
  return rows.map(row => {
    const newId = generateUUID();
    idMappings.workflow_steps[row.id] = newId;
    const normalizedCategory =
      row.category_code === 90 ? 90 : 10;

    return {
      id: newId,
      workflow_id: idMappings.workflows[row.workflow_id],
      step_code: row.step_code,  // Keep as TEXT
      step_name: row.step_name,
      step_order: row.step_order,
      category_code: normalizedCategory,
      workgroup_id: row.workgroup_code ? idMappings.workgroups[row.workgroup_code] : null,
      description: null,  // New field
      created_at: convertTimestamp(row.created_at) || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    };
  });
}

async function exportWorkflowTransitions() {
  console.log('\n📦 Exporting workflow transitions...');
  
  // Check if table exists
  const tableExists = sqlite.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='workflow_transitions'
  `).get();
  
  if (!tableExists) {
    console.log('   ⚠️  workflow_transitions table not found - skipping');
    stats.workflow_transitions = { exported: 0, imported: 0 };
    return [];
  }
  
  const rows = sqlite.prepare('SELECT * FROM workflow_transitions').all();
  stats.workflow_transitions = { exported: rows.length, imported: 0 };
  
  return rows.map(row => ({
    id: generateUUID(),
    workflow_id: idMappings.workflows[row.workflow_id],
    from_step_code: row.from_step_code,  // Keep as TEXT (FK to workflow_steps.step_code)
    to_step_code: row.to_step_code,
    transition_name: null,  // Not in current schema
    requires_comment: false,  // Not in current schema
    cancel_allowed: convertBoolean(row.cancel_allowed),
    created_at: convertTimestamp(row.created_at) || new Date().toISOString(),
    deleted_at: null
  }));
}

async function exportModules() {
  console.log('\n📦 Exporting modules...');
  const rows = sqlite.prepare('SELECT * FROM modules').all();
  stats.modules.exported = rows.length;
  
  return rows.map(row => {
    const newId = generateUUID();
    idMappings.modules[row.id] = newId;
    
    return {
      id: newId,
      name: row.name,
      description: row.description,
      active: convertBoolean(row.active),
      created_at: convertTimestamp(row.created_at) || new Date().toISOString(),
      updated_at: convertTimestamp(row.updated_at) || new Date().toISOString(),
      deleted_at: null
    };
  });
}

async function exportTags() {
  console.log('\n📦 Exporting tags...');
  const rows = sqlite.prepare('SELECT * FROM tags').all();
  stats.tags.exported = rows.length;
  
  return rows.map(row => {
    const newId = generateUUID();
    idMappings.tags[row.id] = newId;
    
    return {
      id: newId,
      label: row.label,
      color: row.color,
      created_at: convertTimestamp(row.created_at) || new Date().toISOString(),
      updated_at: convertTimestamp(row.updated_at) || new Date().toISOString(),
      deleted_at: null
    };
  });
}

async function exportTickets() {
  console.log('\n📦 Exporting tickets...');
  const rows = sqlite.prepare('SELECT * FROM tickets').all();
  stats.tickets.exported = rows.length;
  
  return rows.map(row => {
    // Store original ticket_id for later mapping (DO NOT generate UUID yet)
    const originalTicketId = row.id;
    
    // Determine created_by from responsible_employee_id as fallback
    const createdBy = row.responsible_employee_id 
      ? idMappings.employees[row.responsible_employee_id] 
      : null;
    
    const workflowId = row.workflow_id ? idMappings.workflows[row.workflow_id] : null;
    const stepCode = workflowId ? row.step_code : null;

    return {
      // NO id field - let PostgreSQL generate UUID
      ticket_code: originalTicketId,  // Store original ID as ticket_code
      title: row.title,
      description: row.description,
      status: normalizeTicketStatus(row.status),
      priority: row.priority || 'Medium',
      workflow_id: workflowId,
      step_code: stepCode,  // Only set when workflow_id is present
      workgroup_id: row.workgroup_id ? idMappings.workgroups[row.workgroup_id] : null,
      responsible_employee_id: row.responsible_employee_id 
        ? idMappings.employees[row.responsible_employee_id] 
        : null,
      created_by: row.created_by ? idMappings.employees[row.created_by] : createdBy,
      module_id: row.module_id ? idMappings.modules[row.module_id] : null,
      start_date: normalizeDate(row.start_date),
      due_date: normalizeDate(row.due_date),
      initiate_date: convertTimestamp(row.initiate_date) || convertTimestamp(row.created_at) || new Date().toISOString(),
      completed_at: null,  // New field - can be updated based on status
      created_at: convertTimestamp(row.created_at) || new Date().toISOString(),
      updated_at: convertTimestamp(row.updated_at) || new Date().toISOString(),
      deleted_at: null
    };
  });
}

async function exportTicketTags() {
  console.log('\n📦 Exporting ticket tags...');
  const rows = sqlite.prepare('SELECT * FROM ticket_tags').all();
  stats.ticket_tags.exported = rows.length;
  
  return rows.map(row => ({
    id: generateUUID(),
    ticket_code: row.ticket_id,  // Store original ticket_id, will map to UUID later
    tag_id: idMappings.tags[row.tag_id],
    created_at: convertTimestamp(row.created_at) || new Date().toISOString(),
    deleted_at: null
  }));
}

async function exportComments(employeesList) {
  console.log('\n📦 Exporting comments...');
  const rows = sqlite.prepare('SELECT * FROM comments').all();
  stats.comments.exported = rows.length;
  
  // Helper: Find employee UUID by name
  const findEmployeeByName = (name) => {
    const employee = employeesList.find(e => e.name === name);
    return employee ? employee.id : null;
  };

  const fallbackEmployeeId =
    employeesList.find(e => e.role_id === 1)?.id || employeesList[0]?.id || null;
  
  return rows.map(row => ({
    id: generateUUID(),
    ticket_code: row.ticket_id,  // Store original ticket_id, will map to UUID later
    text: row.text,
    author_id: findEmployeeByName(row.author) || fallbackEmployeeId,
    comment_type: row.comment_type || 'comment',
    created_at: convertTimestamp(row.timestamp) || convertTimestamp(row.created_at) || new Date().toISOString(),
    updated_at: convertTimestamp(row.timestamp) || convertTimestamp(row.created_at) || new Date().toISOString(),
    deleted_at: null
  }));
}

async function exportAttachments(employeesList) {
  console.log('\n📦 Exporting attachments...');
  console.log('⚠️  WARNING: file_data BLOBs will be skipped. You must upload files to R2/S3 separately.');
  
  const rows = sqlite.prepare('SELECT * FROM attachments').all();
  stats.attachments.exported = rows.length;
  
  // Helper: Find employee UUID by name
  const findEmployeeByName = (name) => {
    const employee = employeesList.find(e => e.name === name);
    return employee ? employee.id : null;
  };
  
  return rows.map(row => {
    // Generate storage key using ticket_code (will be updated after ticket mapping)
    const storageKey = `tickets/${row.ticket_id}/${row.filename}`;
    
    if (row.file_data) {
      stats.attachments.skipped++;
    }
    
    return {
      id: generateUUID(),
      ticket_code: row.ticket_id,  // Store original ticket_id, will map to UUID later
      filename: row.filename,
      file_type: row.file_type,
      file_size: row.file_size,
      storage_key: storageKey,
      storage_bucket: 'liteboard-attachments',
      uploaded_by: findEmployeeByName(row.uploaded_by),
      uploaded_at: convertTimestamp(row.uploaded_at) || new Date().toISOString(),
      deleted_at: null
    };
  });
}

async function exportStatusHistory(employeesList) {
  console.log('\n📦 Exporting status history...');
  const rows = sqlite.prepare('SELECT * FROM status_history').all();
  stats.status_history.exported = rows.length;
  
  // Helper: Find employee UUID by name
  const findEmployeeByName = (name) => {
    const employee = employeesList.find(e => e.name === name);
    return employee ? employee.id : null;
  };

  const fallbackEmployeeId =
    employeesList.find(e => e.role_id === 1)?.id || employeesList[0]?.id || null;
  
  return rows.map(row => ({
    id: generateUUID(),
    ticket_code: row.ticket_id,  // Store original ticket_id, will map to UUID later
    activity_type: row.activity_type,
    field_name: row.field_name,
    old_value: row.old_value,
    new_value: row.new_value,
    changed_by: findEmployeeByName(row.changed_by) || fallbackEmployeeId,
    created_at: convertTimestamp(row.timestamp) || new Date().toISOString()
  }));
}

// Import function
async function importData(table, data) {
  if (DRY_RUN) {
    console.log(`   [DRY RUN] Would import ${data.length} rows into ${table}`);
    stats[table].imported = data.length;
    return;
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    for (const row of data) {
      const columns = Object.keys(row).join(', ');
      const placeholders = Object.keys(row).map((_, i) => `$${i + 1}`).join(', ');
      const values = Object.values(row);
      
      try {
        await client.query(
          `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
          values
        );
        stats[table].imported++;
      } catch (error) {
        console.error(`   ❌ Error inserting into ${table}:`, error.message);
        console.error('   Row:', row);
        throw error;
      }
    }
    
    await client.query('COMMIT');
    console.log(`   ✅ Imported ${stats[table].imported} rows into ${table}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Build ticket_code to UUID mapping from PostgreSQL
async function buildTicketCodeMapping() {
  console.log('\n🔗 Building ticket_code → UUID mapping...');
  
  if (DRY_RUN) {
    console.log('   [DRY RUN] Skipping mapping in dry run mode');
    return {};
  }
  
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      'SELECT id, ticket_code FROM tickets WHERE deleted_at IS NULL'
    );
    
    const mapping = {};
    for (const row of result.rows) {
      mapping[row.ticket_code] = row.id;
    }
    
    console.log(`   ✅ Mapped ${Object.keys(mapping).length} ticket codes to UUIDs`);
    return mapping;
  } catch (error) {
    console.error('   ❌ Error building ticket mapping:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Import dependent data with ticket UUID mapping
async function importDependentData(table, data, ticketCodeMapping) {
  if (DRY_RUN) {
    console.log(`   [DRY RUN] Would import ${data.length} rows into ${table}`);
    stats[table].imported = data.length;
    return;
  }
  
  const client = await pool.connect();
  let skippedCount = 0;
  
  try {
    await client.query('BEGIN');
    
    for (const row of data) {
      // Map ticket_code to ticket_id (UUID)
      const ticketCode = row.ticket_code;
      const ticketUuid = ticketCodeMapping[ticketCode];
      
      if (!ticketUuid) {
        console.error(`   ⚠️  Skipping row - ticket_code not found: ${ticketCode}`);
        skippedCount++;
        continue;
      }
      
      // Replace ticket_code with ticket_id
      const rowData = { ...row };
      delete rowData.ticket_code;
      rowData.ticket_id = ticketUuid;
      
      const columns = Object.keys(rowData).join(', ');
      const placeholders = Object.keys(rowData).map((_, i) => `$${i + 1}`).join(', ');
      const values = Object.values(rowData);
      
      try {
        await client.query(
          `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
          values
        );
        stats[table].imported++;
      } catch (error) {
        console.error(`   ❌ Error inserting into ${table}:`, error.message);
        console.error('   Row:', rowData);
        throw error;
      }
    }
    
    await client.query('COMMIT');
    console.log(`   ✅ Imported ${stats[table].imported} rows into ${table}${skippedCount > 0 ? ` (skipped ${skippedCount})` : ''}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Main migration
async function migrate() {
  console.log('\n🚀 Starting LiteBoard Migration: SQLite → PostgreSQL (Neon)\n');
  console.log(`   SQLite: ${SQLITE_DB_PATH}`);
  console.log(`   Neon Host: ${NEON_CONFIG.host}`);
  console.log(`   Neon Database: ${NEON_CONFIG.database}`);
  console.log(`   Neon User: ${NEON_CONFIG.user}`);
  console.log(`   Dry Run: ${DRY_RUN}\n`);
  
  // Test connection to Neon
  console.log('🔌 Testing Neon connection...');
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT version(), current_database(), current_user');
    console.log(`   ✅ Connected to Neon successfully`);
    console.log(`   Database: ${result.rows[0].current_database}`);
    console.log(`   User: ${result.rows[0].current_user}`);
    console.log(`   PostgreSQL Version: ${result.rows[0].version.split(',')[0]}\n`);
    client.release();
  } catch (error) {
    console.error('   ❌ Failed to connect to Neon:');
    console.error(`   ${error.message}\n`);
    console.error('Please check:');
    console.error('  1. NEON_PASSWORD is correct');
    console.error('  2. Network connectivity to Neon');
    console.error('  3. Database exists and user has access\n');
    process.exit(1);
  }
  
  try {
    // Step 1: Export from SQLite
    console.log('═══════════════════════════════════════════════════════');
    console.log('PHASE 1: EXPORTING FROM SQLITE');
    console.log('═══════════════════════════════════════════════════════');
    
    const workgroups = await exportWorkgroups();
    const employees = await exportEmployees();
    const workflows = await exportWorkflows();
    const workflowSteps = await exportWorkflowSteps();
    const workflowTransitions = await exportWorkflowTransitions();
    const modules = await exportModules();
    const tags = await exportTags();
    const tickets = await exportTickets();
    const ticketTags = await exportTicketTags();
    const comments = await exportComments(employees);
    const attachments = await exportAttachments(employees);
    const statusHistory = await exportStatusHistory(employees);
    
    console.log('\n✅ Export complete\n');
    
    // Step 2: Import to PostgreSQL (Phase 2A - Non-ticket-dependent tables)
    console.log('═══════════════════════════════════════════════════════');
    console.log('PHASE 2A: IMPORTING INDEPENDENT TABLES');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Import in dependency order (tables that don't reference tickets)
    await importData('workgroups', workgroups);
    await importData('employees', employees);
    await importData('workflows', workflows);
    await importData('workflow_steps', workflowSteps);
    await importData('workflow_transitions', workflowTransitions);
    await importData('modules', modules);
    await importData('tags', tags);
    
    // Import tickets (PostgreSQL will generate UUIDs)
    await importData('tickets', tickets);
    
    // Step 2B: Build ticket_code → UUID mapping
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('PHASE 2B: MAPPING TICKET CODES TO UUIDS');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const ticketCodeMapping = await buildTicketCodeMapping();
    
    // Step 2C: Import ticket-dependent tables with UUID mapping
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('PHASE 2C: IMPORTING TICKET-DEPENDENT TABLES');
    console.log('═══════════════════════════════════════════════════════\n');
    
    await importDependentData('ticket_tags', ticketTags, ticketCodeMapping);
    await importDependentData('comments', comments, ticketCodeMapping);
    await importDependentData('attachments', attachments, ticketCodeMapping);
    await importDependentData('status_history', statusHistory, ticketCodeMapping);
    
    console.log('\n✅ Import complete\n');
    
    // Step 3: Save ID mappings (including ticket code mapping)
    const mappingFile = 'id-mappings.json';
    const allMappings = {
      ...idMappings,
      ticket_codes: ticketCodeMapping
    };
    fs.writeFileSync(mappingFile, JSON.stringify(allMappings, null, 2));
    console.log(`📄 ID mappings saved to ${mappingFile}\n`);
    
    // Step 4: Print statistics
    console.log('═══════════════════════════════════════════════════════');
    console.log('MIGRATION STATISTICS');
    console.log('═══════════════════════════════════════════════════════\n');
    
    for (const [table, counts] of Object.entries(stats)) {
      console.log(`${table.padEnd(20)} Exported: ${counts.exported.toString().padStart(5)}  Imported: ${counts.imported.toString().padStart(5)}`);
      if (counts.skipped) {
        console.log(`${''.padEnd(20)} Skipped: ${counts.skipped} (file BLOBs)`);
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('NEXT STEPS');
    console.log('═══════════════════════════════════════════════════════\n');
    
    if (stats.attachments.skipped > 0) {
      console.log(`⚠️  ${stats.attachments.skipped} attachments have file_data BLOBs that need to be uploaded to R2/S3`);
      console.log('   Use the extract-attachments.js script to export files and upload them.\n');
    }
    
    console.log('1. Verify data integrity in PostgreSQL');
    console.log('2. Update application code to use PostgreSQL (see MIGRATION_GUIDE.md)');
    console.log('3. Test all CRUD operations');
    console.log('4. Upload attachment files to object storage');
    console.log('5. Run integration tests');
    console.log('6. Deploy to staging\n');
    
    console.log('✅ Migration completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    sqlite.close();
    await pool.end();
  }
}

// Run migration
migrate();
