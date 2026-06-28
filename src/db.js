const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/trading-trainer.db');

const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.exec('PRAGMA journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    date                    TEXT NOT NULL,
    instrument              TEXT NOT NULL DEFAULT 'MCL',
    briefing_classification TEXT,
    or_timeframe            INTEGER,
    orh                     REAL,
    orl                     REAL,
    vwap                    REAL,
    or_formed               INTEGER DEFAULT 0,
    created_at              TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS setups (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id              INTEGER REFERENCES sessions(id),
    instrument              TEXT NOT NULL DEFAULT 'MCL',
    strategy                TEXT NOT NULL DEFAULT 'ORB Pullback',
    direction               TEXT,
    entry_price             REAL,
    stop_price              REAL,
    target_price            REAL,
    rr_planned              REAL,
    rr_actual               REAL,
    outcome                 TEXT,
    or_range_size           REAL,
    checklist_flags         TEXT,
    setup_grade             TEXT,
    notes                   TEXT,
    counts_toward_milestone INTEGER DEFAULT 0,
    created_at              TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = db;
