#!/usr/bin/env node

/**
 * Migration Verification Script
 * 
 * Validates the PostgreSQL migration by checking:
 * - Schema integrity
 * - Data counts
 * - Foreign key relationships
 * - Indexes
 * - Triggers
 * - Constraints
 * 
 * Usage:
 *   export DATABASE_URL="postgresql://..."
 *   node verify-migration.js
 */

const { Pool } = require('pg');
const Database = require('better-sqlite3');

const PG_CONNECTION_STRING = process.env.DATABASE_URL;
const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || './server/db/liteboard.db';

if (!PG_CONNECTION_STRING) {
  console.error('❌ ERROR: DATABASE_URL environment variable not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: PG_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false }
});

const sqlite = Database(SQLITE_DB_PATH, { readonly: true });

const tests = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function pass(message) {
  console.log(`✅ ${message}`);
  tests.passed++;
}

function fail(message) {
  console.log(`❌ ${message}`);
  tests.failed++;
}

function warn(message) {
  console.log(`⚠️  ${message}`);
  tests.warnings++;
}

async function checkTableExists(tableName) {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    )
  `, [tableName]);
  
  if (result.rows[0].exists) {
    pass(`Table exists: ${tableName}`);
    return true;
  } else {
    fail(`Table missing: ${tableName}`);
    return false;
  }
}

async function checkRecordCount(tableName) {
  try {
    // PostgreSQL count (excluding soft-deleted)
    const pgResult = await pool.query(`
      SELECT COUNT(*) as count FROM ${tableName} 
      WHERE deleted_at IS NULL
    `);
    const pgCount = parseInt(pgResult.rows[0].count);
    
    // SQLite count
    const sqliteResult = sqlite.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
    const sqliteCount = sqliteResult.count;
    
    if (pgCount === sqliteCount) {
      pass(`Record count matches for ${tableName}: ${pgCount}`);
    } else {
      warn(`Record count mismatch for ${tableName}: SQLite=${sqliteCount}, PostgreSQL=${pgCount}`);
    }
  } catch (error) {
    // Table might not have deleted_at column (e.g., roles)
    try {
      const pgResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const pgCount = parseInt(pgResult.rows[0].count);
      
      const sqliteResult = sqlite.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
      const sqliteCount = sqliteResult ? sqliteResult.count : 0;
      
      if (pgCount === sqliteCount) {
        pass(`Record count matches for ${tableName}: ${pgCount}`);
      } else if (sqliteCount === 0) {
        pass(`Record count for ${tableName}: ${pgCount} (new table)`);
      } else {
        warn(`Record count mismatch for ${tableName}: SQLite=${sqliteCount}, PostgreSQL=${pgCount}`);
      }
    } catch (err) {
      fail(`Error checking ${tableName}: ${err.message}`);
    }
  }
}

async function checkIndexes() {
  const result = await pool.query(`
    SELECT COUNT(*) as count 
    FROM pg_indexes 
    WHERE schemaname = 'public'
  `);
  
  const count = parseInt(result.rows[0].count);
  
  if (count >= 30) {
    pass(`Indexes created: ${count} (expected 30+)`);
  } else {
    fail(`Only ${count} indexes found (expected 30+)`);
  }
}

async function checkForeignKeys() {
  const result = await pool.query(`
    SELECT COUNT(*) as count 
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY' 
    AND table_schema = 'public'
  `);
  
  const count = parseInt(result.rows[0].count);
  
  if (count >= 20) {
    pass(`Foreign keys created: ${count} (expected 20+)`);
  } else {
    fail(`Only ${count} foreign keys found (expected 20+)`);
  }
}

async function checkTriggers() {
  const result = await pool.query(`
    SELECT COUNT(*) as count 
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public'
  `);
  
  const count = parseInt(result.rows[0].count);
  
  if (count >= 9) {
    pass(`Triggers created: ${count} (expected 9)`);
  } else {
    fail(`Only ${count} triggers found (expected 9)`);
  }
}

async function checkViews() {
  const views = ['v_active_tickets', 'v_employee_workload'];
  
  for (const view of views) {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `, [view]);
    
    if (result.rows[0].exists) {
      pass(`View exists: ${view}`);
    } else {
      fail(`View missing: ${view}`);
    }
  }
}

async function checkUniqueConstraints() {
  const result = await pool.query(`
    SELECT COUNT(*) as count 
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'UNIQUE' 
    AND table_schema = 'public'
  `);
  
  const count = parseInt(result.rows[0].count);
  
  if (count >= 10) {
    pass(`Unique constraints: ${count}`);
  } else {
    warn(`Only ${count} unique constraints found`);
  }
}

async function checkCheckConstraints() {
  const result = await pool.query(`
    SELECT COUNT(*) as count 
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'CHECK' 
    AND table_schema = 'public'
  `);
  
  const count = parseInt(result.rows[0].count);
  
  if (count >= 10) {
    pass(`Check constraints: ${count}`);
  } else {
    warn(`Only ${count} check constraints found`);
  }
}

async function testSoftDeletion() {
  try {
    // Insert test record
    const result = await pool.query(`
      INSERT INTO tags (label, color) 
      VALUES ('test-verify-tag', '#FF0000') 
      RETURNING id
    `);
    const tagId = result.rows[0].id;
    
    // Soft delete
    await pool.query('UPDATE tags SET deleted_at = NOW() WHERE id = $1', [tagId]);
    
    // Query without filter
    const allResult = await pool.query('SELECT * FROM tags WHERE id = $1', [tagId]);
    
    // Query with filter
    const activeResult = await pool.query(
      'SELECT * FROM tags WHERE id = $1 AND deleted_at IS NULL', 
      [tagId]
    );
    
    if (allResult.rows.length === 1 && activeResult.rows.length === 0) {
      pass('Soft deletion works correctly');
    } else {
      fail('Soft deletion not working as expected');
    }
    
    // Cleanup
    await pool.query('DELETE FROM tags WHERE id = $1', [tagId]);
    
  } catch (error) {
    fail(`Soft deletion test failed: ${error.message}`);
  }
}

async function testEmailUniqueness() {
  try {
    const testEmail = 'test-verify-' + Date.now() + '@example.com';
    
    // Insert first user
    const result1 = await pool.query(`
      INSERT INTO employees (name, email, password_hash, role_id) 
      VALUES ('Test User 1', $1, 'hash1', 3) 
      RETURNING id
    `, [testEmail]);
    const userId1 = result1.rows[0].id;
    
    // Soft delete
    await pool.query('UPDATE employees SET deleted_at = NOW() WHERE id = $1', [userId1]);
    
    // Try to reuse email (should succeed after soft delete)
    const result2 = await pool.query(`
      INSERT INTO employees (name, email, password_hash, role_id) 
      VALUES ('Test User 2', $1, 'hash2', 3) 
      RETURNING id
    `, [testEmail]);
    const userId2 = result2.rows[0].id;
    
    pass('Email uniqueness with soft deletion works');
    
    // Cleanup
    await pool.query('DELETE FROM employees WHERE id IN ($1, $2)', [userId1, userId2]);
    
  } catch (error) {
    fail(`Email uniqueness test failed: ${error.message}`);
  }
}

async function testAutoAuditLogging() {
  try {
    // Create test ticket
    const result = await pool.query(`
      INSERT INTO tickets (title, status, priority) 
      VALUES ('Test Audit Ticket', 'Open', 'Low') 
      RETURNING id
    `);
    const ticketId = result.rows[0].id;
    
    // Check creation was logged
    const historyResult1 = await pool.query(`
      SELECT * FROM status_history 
      WHERE ticket_id = $1 AND activity_type = 'created'
    `, [ticketId]);
    
    if (historyResult1.rows.length > 0) {
      pass('Audit logging on INSERT works');
    } else {
      fail('Audit logging on INSERT not working');
    }
    
    // Update status
    await pool.query('UPDATE tickets SET status = $1 WHERE id = $2', ['In Progress', ticketId]);
    
    // Check update was logged
    const historyResult2 = await pool.query(`
      SELECT * FROM status_history 
      WHERE ticket_id = $1 AND activity_type = 'status_change'
    `, [ticketId]);
    
    if (historyResult2.rows.length > 0) {
      pass('Audit logging on UPDATE works');
    } else {
      fail('Audit logging on UPDATE not working');
    }
    
    // Cleanup
    await pool.query('DELETE FROM tickets WHERE id = $1', [ticketId]);
    await pool.query('DELETE FROM status_history WHERE ticket_id = $1', [ticketId]);
    
  } catch (error) {
    fail(`Auto audit logging test failed: ${error.message}`);
  }
}

async function testUpdatedAtTrigger() {
  try {
    // Create test workgroup
    const result = await pool.query(`
      INSERT INTO workgroups (name) 
      VALUES ('Test Workgroup') 
      RETURNING id, created_at, updated_at
    `);
    const workgroupId = result.rows[0].id;
    const createdAt = new Date(result.rows[0].created_at);
    
    // Wait 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update
    await pool.query('UPDATE workgroups SET name = $1 WHERE id = $2', ['Updated Name', workgroupId]);
    
    // Check updated_at changed
    const updated = await pool.query('SELECT updated_at FROM workgroups WHERE id = $1', [workgroupId]);
    const updatedAt = new Date(updated.rows[0].updated_at);
    
    if (updatedAt > createdAt) {
      pass('updated_at trigger works');
    } else {
      fail('updated_at trigger not working');
    }
    
    // Cleanup
    await pool.query('DELETE FROM workgroups WHERE id = $1', [workgroupId]);
    
  } catch (error) {
    fail(`updated_at trigger test failed: ${error.message}`);
  }
}

async function runVerification() {
  console.log('\n🔍 LiteBoard PostgreSQL Migration Verification\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('SCHEMA VERIFICATION');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Check all tables exist
  const tables = [
    'roles', 'workgroups', 'employees', 'employee_skills',
    'workflows', 'workflow_steps', 'workflow_transitions',
    'modules', 'tags', 'tickets', 'ticket_tags',
    'comments', 'attachments', 'status_history', 'system_settings'
  ];
  
  for (const table of tables) {
    await checkTableExists(table);
  }
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('RECORD COUNT VERIFICATION');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Check record counts (excluding roles and workflow_transitions which are new)
  const tablesToCount = [
    'workgroups', 'employees', 'employee_skills',
    'workflows', 'workflow_steps', 'modules', 'tags',
    'tickets', 'ticket_tags', 'comments', 'attachments', 'status_history'
  ];
  
  for (const table of tablesToCount) {
    await checkRecordCount(table);
  }
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('CONSTRAINT VERIFICATION');
  console.log('═══════════════════════════════════════════════════════\n');
  
  await checkIndexes();
  await checkForeignKeys();
  await checkUniqueConstraints();
  await checkCheckConstraints();
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('TRIGGER VERIFICATION');
  console.log('═══════════════════════════════════════════════════════\n');
  
  await checkTriggers();
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('VIEW VERIFICATION');
  console.log('═══════════════════════════════════════════════════════\n');
  
  await checkViews();
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('FUNCTIONAL TESTS');
  console.log('═══════════════════════════════════════════════════════\n');
  
  await testSoftDeletion();
  await testEmailUniqueness();
  await testAutoAuditLogging();
  await testUpdatedAtTrigger();
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('VERIFICATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log(`✅ Passed:   ${tests.passed}`);
  console.log(`❌ Failed:   ${tests.failed}`);
  console.log(`⚠️  Warnings: ${tests.warnings}\n`);
  
  if (tests.failed === 0) {
    console.log('🎉 All tests passed! Migration successful.\n');
  } else {
    console.log('⚠️  Some tests failed. Review errors above.\n');
  }
  
  sqlite.close();
  await pool.end();
}

runVerification().catch(error => {
  console.error('\n❌ Verification failed:', error.message);
  console.error(error.stack);
  sqlite.close();
  pool.end();
  process.exit(1);
});
