const fs = require('fs');
const path = require('path');
const { pool, query } = require('./pool');

async function runMigrations() {
  console.log('--- Running SmartAPI Database Migrations ---');
  const migrationsDir = path.join(__dirname, 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found.');
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    console.log(`Executing migration: ${file}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    try {
      await query(sql);
      console.log(`✅ Applied migration: ${file}`);
    } catch (err) {
      console.error(`❌ Migration failed [${file}]:`, err.message);
      throw err;
    }
  }

  console.log('All migrations applied successfully.');
}

if (require.main === module) {
  runMigrations()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      pool.end();
      process.exit(1);
    });
}

module.exports = runMigrations;
