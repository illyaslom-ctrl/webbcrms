'use strict';

// Used only on pages that need an account: making levels, comments, account pages.
// After logging in the visitor is sent back to the page they wanted.
module.exports = function requireLogin(req, res, next) {
  if (req.user) return next();
  if (req.method === 'GET') req.session.returnTo = req.originalUrl;
  res.redirect('/login');
};
