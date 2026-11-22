'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { verifyCsrf } = require('../middleware/csrf');
const requireLogin = require('../middleware/requireLogin');
const { validateAccount } = require('../lib/validate');
const { hashPassword, comparePassword, DUMMY_HASH } = require('../lib/passwords');

const router = express.Router();

const findUser = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?');
const insertUser = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');

function requireGuest(req, res, next) {
  if (req.session.user) return res.redirect('/levels');
  next();
}

// Replace the session ID (stops session fixation), then store the user.
function logIn(req, user) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.user = { id: user.id, username: user.username };
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

// Only failed logins count (status 400 and up). 5 failures per IP in 15 minutes.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).render('login', {
      loginError: 'Too many attempts. Try again in 15 minutes.',
      values: { username: '' },
    });
  },
});

router.get('/register', requireGuest, (req, res) => {
  res.render('register', { errors: {}, values: { username: '' } });
});

router.post('/register', requireGuest, verifyCsrf, async (req, res) => {
  const { errors, values } = validateAccount(req.body || {});

  if (!errors.username && findUser.get(values.username)) {
    errors.username = 'Username is already taken.';
  }
  if (Object.keys(errors).length) {
    return res.status(400).render('register', { errors, values });
  }

  const hash = await hashPassword(req.body.password);
  let userId;
  try {
    userId = insertUser.run(values.username, hash).lastInsertRowid;
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      errors.username = 'Username is already taken.';
      return res.status(400).render('register', { errors, values });
    }
    throw err;
  }

  await logIn(req, { id: Number(userId), username: values.username });
  res.redirect('/levels');
});

router.get('/login', requireGuest, (req, res) => {
  res.render('login', { loginError: null, values: { username: '' } });
});

router.post('/login', requireGuest, loginLimiter, verifyCsrf, async (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  const user = username && username.length <= 20 ? findUser.get(username) : undefined;
  // Always run bcrypt so a wrong username and a wrong password look the same.
  const ok = await comparePassword(password.slice(0, 72), user ? user.password_hash : DUMMY_HASH);

  if (!user || !ok) {
    return res.status(401).render('login', {
      loginError: 'Wrong username or password.',
      values: { username },
    });
  }

  await logIn(req, user);
  res.redirect('/levels');
});

router.post('/logout', requireLogin, verifyCsrf, (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

module.exports = router;
