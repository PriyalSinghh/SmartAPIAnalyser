const fs = require('fs');
const path = require('path');
const { pool, query } = require('./pool');

async function initializeDatabase() {
  console.log('--- Initializing SmartAPI Database Schema ---');
  const sqlFilePath = path.join(__dirname, 'init.sql');

  try {
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log(`Executing SQL from: ${sqlFilePath}`);
    await query(sqlContent);
    console.log('✅ Database schema initialized successfully: api_logs table & indexes created.');
  } catch (error) {
    console.error('❌ Failed to initialize database schema:');
    console.error(error.message);
    if (error.code === '3D000') {
      console.error('\nHint: The database "smart_api_analyzer" does not exist yet.');
      console.error('Please run: createdb smart_api_analyzer (or CREATE DATABASE smart_api_analyzer;) and try again.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\nHint: PostgreSQL does not seem to be running on this host/port.');
      console.error('Please verify your PostgreSQL service is running and check your .env settings.');
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;

