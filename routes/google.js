'use strict';

const crypto = require('crypto');
const express = require('express');
const db = require('../db');
const google = require('../lib/google');
const { logIn } = require('../lib/session');

const router = express.Router();

const findByGoogleId = db.prepare('SELECT id, username FROM users WHERE google_id = ?');
const usernameTaken = db.prepare('SELECT 1 FROM users WHERE username = ?');
const insertUser = db.prepare(
  "INSERT INTO users (username, password_hash, google_id, email) VALUES (?, '!', ?, ?)"
);

// Turns "Jane Doe" into a valid nickname like "Jane_Doe" that nobody else has.
function makeUsername(name, email) {
  let base = String(name || (email || '').split('@')[0] || '')
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 14);
  if (base.length < 3) base = 'user';
  if (!usernameTaken.get(base)) return base;
  for (let i = 0; i < 20; i++) {
    const candidate = `${base}_${crypto.randomInt(1000, 99999)}`;
    if (!usernameTaken.get(candidate)) return candidate;
  }
  return `user_${crypto.randomUUID().slice(0, 8)}`;
}

function failed(res, message) {
  res.status(400).render('login', { loginError: message, values: { username: '' } });
}

router.get('/auth/google', (req, res) => {
  if (!google.enabled()) return res.status(404).render('404');
  if (req.user) return res.redirect('/levels');
  const state = crypto.randomBytes(24).toString('hex');
  req.session.oauthState = state;
  res.redirect(google.authUrl(req, state));
});

router.get('/auth/google/callback', async (req, res) => {
  if (!google.enabled()) return res.status(404).render('404');

  const expected = Buffer.from(String(req.session.oauthState || ''));
  delete req.session.oauthState;
  const got = Buffer.from(String(req.query.state || ''));
  const stateOk = expected.length > 0 && got.length === expected.length && crypto.timingSafeEqual(expected, got);

  if (req.query.error) return failed(res, 'Google sign-in was cancelled.');
  if (!stateOk || typeof req.query.code !== 'string') {
    return failed(res, 'Google sign-in failed. Please try again.');
  }

  let profile;
  try {
    profile = await google.fetchProfile(req, req.query.code);
  } catch (err) {
    console.error('Google sign-in error:', err.message);
    return failed(res, 'Google sign-in failed. Please try again.');
  }

  if (!profile || !profile.sub || !profile.email || profile.email_verified !== true) {
    return failed(res, 'Your Google email address is not verified.');
  }

  let user = findByGoogleId.get(String(profile.sub));
  if (!user) {
    for (let attempt = 0; attempt < 5 && !user; attempt++) {
      const username = makeUsername(profile.name, profile.email);
      try {
        const id = Number(insertUser.run(username, String(profile.sub), profile.email).lastInsertRowid);
        user = { id, username };
      } catch (err) {
        if (err.code !== 'SQLITE_CONSTRAINT_UNIQUE') throw err;
        user = findByGoogleId.get(String(profile.sub)) || null; // another request just created it
      }
    }
    if (!user) return failed(res, 'Google sign-in failed. Please try again.');
  }

  const next = await logIn(req, user);
  res.redirect(next);
});

module.exports = router;
