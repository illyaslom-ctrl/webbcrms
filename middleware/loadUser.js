'use strict';

const db = require('../db');

const getUser = db.prepare('SELECT id, username, avatar, password_hash FROM users WHERE id = ?');

// Looks up the logged-in user on every request, so a renamed or deleted
// account is never out of date.
module.exports = function loadUser(req, res, next) {
  req.user = null;
  res.locals.user = null;
  const saved = req.session.user;
  if (saved) {
    const row = getUser.get(saved.id);
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
};
