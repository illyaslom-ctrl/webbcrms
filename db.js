'use strict';

const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

// Where the data lives:
//   TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN)  -> Turso, a hosted SQLite database that survives restarts.
//   nothing set                              -> a local file, DATA_DIR/app.db (or ./data/app.db).
const remoteUrl = process.env.TURSO_DATABASE_URL;
let url = remoteUrl;
if (!url) {
  const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  url = 'file:' + path.join(dataDir, 'app.db').replace(/\\/g, '/');
}

const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });

const isRemote = Boolean(remoteUrl);

function toObject(columns, row) {
  const out = {};
  columns.forEach((name, i) => {
    out[name] = row[i];
  });
  return out;
}

function stmt(sql, args) {
  return { sql, args: args || [] };
}

// All of these are async. Use "?" placeholders and pass the values in an array.
async function all(sql, args) {
  const rs = await client.execute(stmt(sql, args));
  return rs.rows.map((row) => toObject(rs.columns, row));
}

async function get(sql, args) {
  const rows = await all(sql, args);
  return rows[0];
}

async function run(sql, args) {
  const rs = await client.execute(stmt(sql, args));
  return {
    changes: rs.rowsAffected,
    lastInsertRowid: rs.lastInsertRowid === undefined ? null : Number(rs.lastInsertRowid),
  };
}

// Runs several statements as one all-or-nothing transaction.
// Each item is [sql, args]. Resolves with one { changes, lastInsertRowid } per statement.
async function batch(items) {
  const results = await client.batch(
    items.map(([sql, args]) => stmt(sql, args)),
    'write'
  );
  return results.map((rs) => ({
    changes: rs.rowsAffected,
    lastInsertRowid: rs.lastInsertRowid === undefined ? null : Number(rs.lastInsertRowid),
  }));
}

function isUniqueError(err) {
  for (let e = err; e; e = e.cause) {
    if (/UNIQUE constraint failed/i.test(String(e.message || ''))) return true;
  }
  return false;
}

const SCHEMA = `
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

CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  expires INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_levels_user ON levels(user_id);
CREATE INDEX IF NOT EXISTS idx_levels_created ON levels(created_at);
CREATE INDEX IF NOT EXISTS idx_photos_level ON level_photos(level_id, position);
CREATE INDEX IF NOT EXISTS idx_comments_level ON comments(level_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);
`;

// Creates the tables when they are missing. Call once, before the server starts listening.
async function init() {
  await client.executeMultiple(SCHEMA);

  // Older databases do not have these user columns yet. Add them once.
  // A user who signs in with Google has password_hash '!', which never matches a password.
  const columns = (await all('PRAGMA table_info(users)')).map((c) => c.name);
  for (const [name, type] of [['google_id', 'TEXT'], ['email', 'TEXT'], ['avatar', 'TEXT']]) {
    if (!columns.includes(name)) await client.execute(`ALTER TABLE users ADD COLUMN ${name} ${type}`);
  }
  await client.execute(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google ON users(google_id) WHERE google_id IS NOT NULL'
  );
}

module.exports = { all, get, run, batch, init, isUniqueError, isRemote, client };
