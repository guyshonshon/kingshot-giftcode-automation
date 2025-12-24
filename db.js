// Simple SQLite database - no external services needed!
const Database = require('better-sqlite3')
const path = require('path')

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'data.db')
const db = new Database(dbPath)

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT UNIQUE NOT NULL,
    added_at TEXT DEFAULT (datetime('now')),
    last_claimed TEXT,
    total_claims INTEGER DEFAULT 0,
    verified INTEGER DEFAULT 0,
    verification_data TEXT
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT (datetime('now')),
    action TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    details TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_players_player_id ON players(player_id);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
`)

module.exports = db

