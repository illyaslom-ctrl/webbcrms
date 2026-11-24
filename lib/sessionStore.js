'use strict';

const session = require('express-session');
const db = require('../db');

// Keeps logins in the database, so they survive a restart of the server.
class DbStore extends session.Store {
  constructor() {
    super();
    // Remove expired sessions now and then. unref() lets the process exit normally.
    const timer = setInterval(() => {
      db.run('DELETE FROM sessions WHERE expires < ?', [Date.now()]).catch((err) =>
        console.error('Could not clean old sessions:', err.message)
      );
    }, 60 * 60 * 1000);
    timer.unref();
  }

  get(sid, callback) {
    db.get('SELECT data, expires FROM sessions WHERE sid = ?', [sid])
      .then((row) => {
        if (!row || row.expires < Date.now()) return callback(null, null);
        try {
          callback(null, JSON.parse(row.data));
        } catch (err) {
          callback(null, null);
        }
      })
      .catch((err) => callback(err));
  }

  set(sid, data, callback) {
    const expires =
      data && data.cookie && data.cookie.expires ? new Date(data.cookie.expires).getTime() : Date.now() + 86400000;
    db.run(
      `INSERT INTO sessions (sid, data, expires) VALUES (?, ?, ?)
       ON CONFLICT(sid) DO UPDATE SET data = excluded.data, expires = excluded.expires`,
      [sid, JSON.stringify(data), expires]
    )
      .then(() => callback && callback(null))
      .catch((err) => callback && callback(err));
  }

  destroy(sid, callback) {
    db.run('DELETE FROM sessions WHERE sid = ?', [sid])
      .then(() => callback && callback(null))
      .catch((err) => callback && callback(err));
  }
}

module.exports = DbStore;
