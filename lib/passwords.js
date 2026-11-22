'use strict';

const bcrypt = require('bcryptjs');

const COST = 12;

function hashPassword(plain) {
  return bcrypt.hash(plain, COST);
}

function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// A real hash that matches nothing. Used so a wrong username takes as long
// to check as a wrong password.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-' + Date.now(), COST);

module.exports = { hashPassword, comparePassword, DUMMY_HASH };
