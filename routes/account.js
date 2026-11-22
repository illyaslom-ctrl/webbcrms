'use strict';

const express = require('express');
const multer = require('multer');
const db = require('../db');
const { verifyCsrf } = require('../middleware/csrf');
const { checkUsername, checkPassword } = require('../lib/validate');
const { hashPassword, comparePassword } = require('../lib/passwords');
const { checkPhoto, saveBuffer, removeFile } = require('../lib/fileCheck');

const router = express.Router();

const AVATAR_MAX = 2 * 1024 * 1024;

const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX, files: 1, fields: 5 },
}).single('avatar');

const getAccount = db.prepare('SELECT id, username, avatar, password_hash, google_id FROM users WHERE id = ?');
const nameTakenByOther = db.prepare('SELECT 1 FROM users WHERE username = ? AND id != ?');
const setUsername = db.prepare('UPDATE users SET username = ? WHERE id = ?');
const setAvatar = db.prepare('UPDATE users SET avatar = ? WHERE id = ?');
const setPasswordHash = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
const levelPhotos = db.prepare(
  'SELECT p.filename FROM level_photos p JOIN levels l ON l.id = p.level_id WHERE l.user_id = ?'
);
const levelMusic = db.prepare('SELECT music_file FROM levels WHERE user_id = ? AND music_file IS NOT NULL');
const deleteUser = db.prepare('DELETE FROM users WHERE id = ?');

function renderAccount(req, res, { status = 200, errors = {}, values = {} } = {}) {
  const account = getAccount.get(req.user.id);
  res.status(status).render('account', {
    errors,
    values: { nickname: account.username, ...values },
    account: { ...account, hasPassword: account.password_hash !== '!', viaGoogle: Boolean(account.google_id) },
  });
}

router.get('/', (req, res) => renderAccount(req, res));

// ---------- Nickname ----------
router.post('/nickname', verifyCsrf, (req, res) => {
  const { value, error } = checkUsername((req.body || {}).nickname, 'Nickname');
  const errors = {};
  if (error) errors.nickname = error;
  else if (nameTakenByOther.get(value, req.user.id)) errors.nickname = 'Nickname is already taken.';

  if (errors.nickname) {
    return renderAccount(req, res, { status: 400, errors, values: { nickname: value } });
  }
  try {
    setUsername.run(value, req.user.id);
  } catch (err) {
    if (err.code !== 'SQLITE_CONSTRAINT_UNIQUE') throw err;
    return renderAccount(req, res, {
      status: 400,
      errors: { nickname: 'Nickname is already taken.' },
      values: { nickname: value },
    });
  }
  req.flash('success', 'Nickname saved.');
  res.redirect('/account');
});

// ---------- Avatar ----------
function handleAvatarUpload(req, res, next) {
  uploadAvatar(req, res, (err) => {
    if (err) {
      req.uploadError = err;
      req.body = req.body || {};
    }
    next();
  });
}

router.post('/avatar', handleAvatarUpload, verifyCsrf, (req, res) => {
  let message = null;
  let ext = null;

  if (req.uploadError) {
    message =
      req.uploadError.code === 'LIMIT_FILE_SIZE'
        ? 'The picture must be 2 MB or smaller.'
        : 'The upload failed. Please try again.';
  } else if (!req.file) {
    message = 'Choose a picture first.';
  } else {
    const result = checkPhoto(req.file);
    if (result.error) message = result.error;
    else ext = result.ext;
  }
  if (message) return renderAccount(req, res, { status: 400, errors: { avatar: message } });

  const previous = getAccount.get(req.user.id).avatar;
  const filename = saveBuffer(req.file.buffer, ext);
  try {
    setAvatar.run(filename, req.user.id);
  } catch (err) {
    removeFile(filename);
    throw err;
  }
  removeFile(previous);
  req.flash('success', 'Picture saved.');
  res.redirect('/account');
});

router.post('/avatar/remove', verifyCsrf, (req, res) => {
  const previous = getAccount.get(req.user.id).avatar;
  setAvatar.run(null, req.user.id);
  removeFile(previous);
  req.flash('success', 'Picture removed.');
  res.redirect('/account');
});

// ---------- Password ----------
router.post('/password', verifyCsrf, async (req, res) => {
  const account = getAccount.get(req.user.id);
  if (account.password_hash === '!') return res.status(404).render('404');

  const body = req.body || {};
  const errors = checkPassword(body.password, body.password2);
  const current = typeof body.current_password === 'string' ? body.current_password : '';
  const currentOk = await comparePassword(current.slice(0, 72), account.password_hash);
  if (!currentOk) errors.current_password = 'Your current password is not correct.';

  if (Object.keys(errors).length) return renderAccount(req, res, { status: 400, errors });

  setPasswordHash.run(await hashPassword(body.password), req.user.id);
  req.flash('success', 'Password changed.');
  res.redirect('/account');
});

// ---------- Delete account ----------
router.post('/delete', verifyCsrf, (req, res, next) => {
  const account = getAccount.get(req.user.id);
  const typed = typeof (req.body || {}).confirm === 'string' ? req.body.confirm.trim() : '';
  if (typed !== account.username) {
    return renderAccount(req, res, {
      status: 400,
      errors: { confirm: 'Type your nickname exactly to delete your account.' },
    });
  }

  // Collect every file first, delete the rows, and only then delete the files.
  const files = [
    account.avatar,
    ...levelPhotos.all(account.id).map((r) => r.filename),
    ...levelMusic.all(account.id).map((r) => r.music_file),
  ];
  deleteUser.run(account.id);
  files.forEach(removeFile);

  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.redirect('/levels');
  });
});

module.exports = router;
