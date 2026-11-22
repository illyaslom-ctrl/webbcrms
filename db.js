'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, 'data');
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

CREATE INDEX IF NOT EXISTS idx_levels_user ON levels(user_id);
CREATE INDEX IF NOT EXISTS idx_levels_created ON levels(created_at);
CREATE INDEX IF NOT EXISTS idx_photos_level ON level_photos(level_id, position);
`);

module.exports = db;
