const Database = require('better-sqlite3');
const db = new Database('data-assets.db');

console.log('Creating tables...');

db.exec(`
  CREATE TABLE IF NOT EXISTS risk_warnings (
    id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL,
    risk_score REAL NOT NULL,
    risk_level TEXT NOT NULL,
    overdue_days INTEGER DEFAULT 0,
    stage_stuck_days INTEGER DEFAULT 0,
    response_speed_score REAL DEFAULT 0,
    historical_pass_rate REAL DEFAULT 0,
    status TEXT NOT NULL,
    suggested_actions TEXT,
    handled_by TEXT,
    handled_at TEXT,
    handling_remark TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);
console.log('risk_warnings table created');

db.exec(`
  CREATE TABLE IF NOT EXISTS handling_records (
    id TEXT PRIMARY KEY,
    warning_id TEXT NOT NULL,
    asset_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    remark TEXT,
    operator_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);
console.log('handling_records table created');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('All tables:', tables);
