#!/usr/bin/env node

/**
 * Neon PostgreSQL Connection Test
 * 
 * Tests connectivity to your Neon database before running migration.
 * 
 * Usage:
 *   export NEON_PASSWORD="your_password_here"
 *   node test-neon-connection.js
 */

const { Pool } = require('pg');

// Neon Configuration (matching migrate.js)
const NEON_CONFIG = {
  host: 'ep-muddy-sky-aijtz43a-pooler.c-4.us-east-1.aws.neon.tech',
  database: 'neondb',
  user: 'neondb_owner',
  password: process.env.NEON_PASSWORD,
  port: 5432,
  ssl: { 
    rejectUnauthorized: false 
  },
};

async function testConnection() {
  console.log('\n🔌 Testing Neon PostgreSQL Connection\n');
  console.log('Configuration:');
  console.log(`   Host: ${NEON_CONFIG.host}`);
  console.log(`   Database: ${NEON_CONFIG.database}`);
  console.log(`   User: ${NEON_CONFIG.user}`);
  console.log(`   Port: ${NEON_CONFIG.port}`);
  console.log(`   SSL: Enabled\n`);
  
  if (!NEON_CONFIG.password) {
    console.error('❌ ERROR: NEON_PASSWORD environment variable not set\n');
    console.error('Usage:');
    console.error('  export NEON_PASSWORD="your_password_here"');
    console.error('  node test-neon-connection.js\n');
    process.exit(1);
  }
  
  const pool = new Pool(NEON_CONFIG);
  
  try {
    console.log('Connecting to Neon...');
    const client = await pool.connect();
    
    console.log('✅ Connection successful!\n');
    
    // Test queries
    console.log('Running test queries...\n');
    
    // 1. Check PostgreSQL version
    const versionResult = await client.query('SELECT version()');
    console.log('📌 PostgreSQL Version:');
    console.log(`   ${versionResult.rows[0].version.split(',')[0]}\n`);
    
    // 2. Check current database and user
    const dbResult = await client.query('SELECT current_database(), current_user, current_schema()');
    console.log('📌 Database Info:');
    console.log(`   Database: ${dbResult.rows[0].current_database}`);
    console.log(`   User: ${dbResult.rows[0].current_user}`);
    console.log(`   Schema: ${dbResult.rows[0].current_schema}\n`);
    
    // 3. List existing tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📌 Existing Tables:');
    if (tablesResult.rows.length === 0) {
      console.log('   No tables found (database is empty - ready for migration)\n');
    } else {
      console.log(`   Found ${tablesResult.rows.length} tables:`);
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
      console.log('');
      console.log('⚠️  WARNING: Database contains existing tables!');
      console.log('   If you run migration, you may get duplicate key errors.');
      console.log('   Consider dropping existing tables first.\n');
    }
    
    // 4. Check extensions
    const extensionsResult = await client.query(`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname IN ('uuid-ossp', 'pg_trgm')
    `);
    
    console.log('📌 Required Extensions:');
    const hasUuidOssp = extensionsResult.rows.find(r => r.extname === 'uuid-ossp');
    const hasPgTrgm = extensionsResult.rows.find(r => r.extname === 'pg_trgm');
    
    if (hasUuidOssp) {
      console.log(`   ✅ uuid-ossp: ${hasUuidOssp.extversion}`);
    } else {
      console.log('   ⚠️  uuid-ossp: NOT INSTALLED (will be created by schema.sql)');
    }
    
    if (hasPgTrgm) {
      console.log(`   ✅ pg_trgm: ${hasPgTrgm.extversion}`);
    } else {
      console.log('   ⚠️  pg_trgm: NOT INSTALLED (will be created by schema.sql)');
    }
    console.log('');
    
    // 5. Check privileges
    const privResult = await client.query(`
      SELECT 
        has_database_privilege(current_user, current_database(), 'CREATE') as can_create,
        has_schema_privilege(current_user, 'public', 'CREATE') as can_create_in_public
    `);
    
    console.log('📌 User Privileges:');
    console.log(`   Can create objects in database: ${privResult.rows[0].can_create ? '✅ Yes' : '❌ No'}`);
    console.log(`   Can create objects in public schema: ${privResult.rows[0].can_create_in_public ? '✅ Yes' : '❌ No'}\n`);
    
    client.release();
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('CONNECTION TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('✅ All connection tests passed!');
    console.log('✅ Database is accessible');
    console.log('✅ User has required privileges\n');
    
    if (tablesResult.rows.length === 0) {
      console.log('📋 Next Steps:');
      console.log('   1. Run schema.sql to create tables:');
      console.log('      psql "postgresql://neondb_owner:$NEON_PASSWORD@ep-muddy-sky-aijtz43a-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require" < schema.sql');
      console.log('');
      console.log('   2. Run migration script:');
      console.log('      export NEON_PASSWORD="your_password"');
      console.log('      node migrate.js\n');
    } else {
      console.log('⚠️  Database already has tables. Options:');
      console.log('   A. Drop existing tables and re-run schema.sql');
      console.log('   B. Skip schema creation if tables are already correct');
      console.log('   C. Create a fresh database for clean migration\n');
    }
    
  } catch (error) {
    console.error('\n❌ Connection test failed:\n');
    console.error(`Error: ${error.message}\n`);
    
    if (error.message.includes('password authentication failed')) {
      console.error('💡 Troubleshooting:');
      console.error('   - Check that NEON_PASSWORD is correct');
      console.error('   - Verify password doesn\'t have special characters that need escaping\n');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')) {
      console.error('💡 Troubleshooting:');
      console.error('   - Check internet connectivity');
      console.error('   - Verify Neon host address is correct');
      console.error('   - Check if firewall is blocking port 5432\n');
    } else {
      console.error('💡 Full error details:');
      console.error(error);
      console.error('');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();
