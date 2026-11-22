'use strict';

// Only allow a path on this site (starts with one "/", not "//" or "/\").
function safeReturn(value) {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  return value;
}

// Replace the session ID (stops session fixation), then store the user.
// Resolves with the page to open next.
function logIn(req, user) {
  const returnTo = safeReturn(req.session.returnTo);
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.user = { id: user.id };
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve(returnTo || '/levels')));
    });
  });
}

module.exports = { logIn, safeReturn };
