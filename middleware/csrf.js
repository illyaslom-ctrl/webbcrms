'use strict';

const crypto = require('crypto');

// Gives every visitor a token (kept in the session) and exposes it to the views.
function csrfToken(req, res, next) {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(32).toString('hex');
  res.locals.csrfToken = req.session.csrf;
  next();
}

// Put this on every POST route. For forms with file uploads, run it AFTER multer,
// because the hidden _csrf field is only readable once the form is parsed.
function verifyCsrf(req, res, next) {
  const sent = Buffer.from(String((req.body && req.body._csrf) || ''));
  const real = Buffer.from(String(req.session.csrf || ''));
  if (real.length > 0 && sent.length === real.length && crypto.timingSafeEqual(sent, real)) {
    return next();
  }
  const err = new Error('Invalid CSRF token');
  err.status = 403;
  err.csrf = true;
  next(err);
}

module.exports = { csrfToken, verifyCsrf };
