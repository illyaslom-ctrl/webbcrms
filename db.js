'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// DATA_DIR lets a host keep the database and uploads on one persistent disk.
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'app.db'));
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS levels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level_number INTEGER,
  description TEXT NOT NULL,
  entities TEXT NOT NULL,
  entries TEXT NOT NULL,
  exits TEXT NOT NULL,
  features TEXT NOT NULL,
  lovely_places TEXT,
  danger_areas TEXT,
  danger_rating INTEGER,
  music_name TEXT,
  music_file TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS level_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level_id INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level_id INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_levels_user ON levels(user_id);
CREATE INDEX IF NOT EXISTS idx_levels_created ON levels(created_at);
CREATE INDEX IF NOT EXISTS idx_photos_level ON level_photos(level_id, position);
CREATE INDEX IF NOT EXISTS idx_comments_level ON comments(level_id, created_at);
`);

// Older databases do not have these user columns yet. Add them once.
// A user who signs in with Google has password_hash '!', which never matches a password.
const userColumns = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
for (const [name, type] of [['google_id', 'TEXT'], ['email', 'TEXT'], ['avatar', 'TEXT']]) {
  if (!userColumns.includes(name)) db.exec(`ALTER TABLE users ADD COLUMN ${name} ${type}`);
}
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google ON users(google_id) WHERE google_id IS NOT NULL');

module.exports = db;
