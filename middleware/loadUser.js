'use strict';

const db = require('../db');

// Looks up the logged-in user on every request, so a renamed or deleted
// account is never out of date.
module.exports = async function loadUser(req, res, next) {
  try {
    req.user = null;
    res.locals.user = null;
    const saved = req.session.user;
    if (saved) {
      const row = await db.get('SELECT id, username, avatar, password_hash FROM users WHERE id = ?', [saved.id]);
      if (row) {
        req.user = {
          id: row.id,
          username: row.username,
          avatar: row.avatar,
          hasPassword: row.password_hash !== '!',
        };
        res.locals.user = req.user;
      } else {
        delete req.session.user;
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};
