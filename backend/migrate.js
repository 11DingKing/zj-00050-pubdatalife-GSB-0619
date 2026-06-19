const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data-assets.db');
const db = new Database(dbPath);

console.log('Running migration for SLA escalation and closure loop...');

const columns = db.prepare("PRAGMA table_info(risk_warnings)").all();
const columnNames = columns.map(c => c.name);

const addColumnIfNotExists = (columnName, columnDef) => {
  if (!columnNames.includes(columnName)) {
    db.exec(`ALTER TABLE risk_warnings ADD COLUMN ${columnName} ${columnDef}`);
    console.log(`Added column: ${columnName}`);
  } else {
    console.log(`Column already exists: ${columnName}`);
  }
};

addColumnIfNotExists('original_risk_level', 'TEXT');
addColumnIfNotExists('escalation_count', 'INTEGER DEFAULT 0');
addColumnIfNotExists('last_escalated_at', 'TEXT');
addColumnIfNotExists('rectification_result', 'TEXT');
addColumnIfNotExists('reviewer_id', 'TEXT');
addColumnIfNotExists('reviewed_at', 'TEXT');
addColumnIfNotExists('review_remark', 'TEXT');
addColumnIfNotExists('handled_at', 'TEXT');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='risk_escalation_logs'").all();
if (tables.length === 0) {
  db.exec(`
    CREATE TABLE risk_escalation_logs (
      id TEXT PRIMARY KEY,
      warning_id TEXT NOT NULL,
      asset_id TEXT NOT NULL,
      from_level TEXT NOT NULL,
      to_level TEXT NOT NULL,
      reason TEXT NOT NULL,
      escalated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (warning_id) REFERENCES risk_warnings(id)
    );
  `);
  console.log('Created table: risk_escalation_logs');
} else {
  console.log('Table already exists: risk_escalation_logs');
}

const updateOriginalLevel = db.prepare(`
  UPDATE risk_warnings 
  SET original_risk_level = risk_level 
  WHERE original_risk_level IS NULL
`);
updateOriginalLevel.run();
console.log('Updated original_risk_level for existing warnings');

console.log('Migration completed successfully!');
