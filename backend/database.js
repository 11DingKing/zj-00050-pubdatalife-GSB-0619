const Database = require("better-sqlite3");
const path = require("path");
const { STAGES } = require("./models");

const dbPath = path.join(__dirname, "data-assets.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

const initDatabase = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_unit TEXT NOT NULL,
      data_scale TEXT,
      ownership_status TEXT,
      current_stage TEXT NOT NULL,
      source_unit_id TEXT,
      operator_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lifecycle_stages (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      stage_name TEXT NOT NULL,
      stage_order INTEGER NOT NULL,
      responsible_dept_id TEXT NOT NULL,
      deadline TEXT,
      status TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (asset_id) REFERENCES assets(id),
      FOREIGN KEY (responsible_dept_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS collaboration_records (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      from_dept_id TEXT NOT NULL,
      to_dept_id TEXT NOT NULL,
      stage_name TEXT NOT NULL,
      action TEXT NOT NULL,
      remark TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (asset_id) REFERENCES assets(id),
      FOREIGN KEY (from_dept_id) REFERENCES departments(id),
      FOREIGN KEY (to_dept_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS todo_items (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      dept_id TEXT NOT NULL,
      stage_name TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      deadline TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (asset_id) REFERENCES assets(id),
      FOREIGN KEY (dept_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS revenue_records (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      amount REAL NOT NULL,
      transaction_date TEXT NOT NULL,
      buyer TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (asset_id) REFERENCES assets(id)
    );

    CREATE TABLE IF NOT EXISTS risk_warnings (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      risk_score REAL NOT NULL,
      risk_level TEXT NOT NULL,
      original_risk_level TEXT,
      overdue_days INTEGER DEFAULT 0,
      stage_stuck_days INTEGER DEFAULT 0,
      response_speed_score REAL DEFAULT 0,
      historical_pass_rate REAL DEFAULT 0,
      status TEXT NOT NULL,
      suggested_actions TEXT,
      handled_by TEXT,
      handled_at TEXT,
      handling_remark TEXT,
      rectification_result TEXT,
      escalation_count INTEGER DEFAULT 0,
      last_escalated_at TEXT,
      reviewed_by TEXT,
      reviewed_at TEXT,
      review_remark TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (asset_id) REFERENCES assets(id)
    );

    CREATE TABLE IF NOT EXISTS handling_records (
      id TEXT PRIMARY KEY,
      warning_id TEXT NOT NULL,
      asset_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      remark TEXT,
      operator_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (warning_id) REFERENCES risk_warnings(id),
      FOREIGN KEY (asset_id) REFERENCES assets(id)
    );

    CREATE TABLE IF NOT EXISTS sla_escalation_logs (
      id TEXT PRIMARY KEY,
      warning_id TEXT NOT NULL,
      asset_id TEXT NOT NULL,
      old_level TEXT NOT NULL,
      new_level TEXT NOT NULL,
      reason TEXT,
      days_pending INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (warning_id) REFERENCES risk_warnings(id),
      FOREIGN KEY (asset_id) REFERENCES assets(id)
    );
  `);

  const ensureColumn = (tableName, columnName, columnDef) => {
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const exists = columns.some((c) => c.name === columnName);
    if (!exists) {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
    }
  };

  ensureColumn("risk_warnings", "original_risk_level", "TEXT");
  ensureColumn("risk_warnings", "rectification_result", "TEXT");
  ensureColumn("risk_warnings", "escalation_count", "INTEGER DEFAULT 0");
  ensureColumn("risk_warnings", "last_escalated_at", "TEXT");
  ensureColumn("risk_warnings", "reviewed_by", "TEXT");
  ensureColumn("risk_warnings", "reviewed_at", "TEXT");
  ensureColumn("risk_warnings", "review_remark", "TEXT");

  const tableExists = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='sla_escalation_logs'",
    )
    .get();
  if (!tableExists) {
    db.exec(`
      CREATE TABLE sla_escalation_logs (
        id TEXT PRIMARY KEY,
        warning_id TEXT NOT NULL,
        asset_id TEXT NOT NULL,
        old_level TEXT NOT NULL,
        new_level TEXT NOT NULL,
        reason TEXT,
        days_pending INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (warning_id) REFERENCES risk_warnings(id),
        FOREIGN KEY (asset_id) REFERENCES assets(id)
      )
    `);
  }

  console.log("数据库初始化完成");
};

module.exports = { db, initDatabase, STAGES };
