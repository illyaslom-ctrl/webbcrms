'use strict';

// One-time messages that survive a redirect, e.g. "Level published."
module.exports = function flash(req, res, next) {
  req.flash = (type, message) => {
    req.session.flash = { type, message };
  };
  res.locals.flash = req.session.flash || null;
  if (req.session.flash) delete req.session.flash;
  next();
};
