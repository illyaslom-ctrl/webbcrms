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

const getAccount = (id) =>
  db.get('SELECT id, username, avatar, password_hash, google_id FROM users WHERE id = ?', [id]);

async function renderAccount(req, res, { status = 200, errors = {}, values = {} } = {}) {
  const account = await getAccount(req.user.id);
  res.status(status).render('account', {
    errors,
    values: { nickname: account.username, ...values },
    account: { ...account, hasPassword: account.password_hash !== '!', viaGoogle: Boolean(account.google_id) },
  });
}

router.get('/', (req, res) => renderAccount(req, res));

// ---------- Nickname ----------
router.post('/nickname', verifyCsrf, async (req, res) => {
  const { value, error } = checkUsername((req.body || {}).nickname, 'Nickname');
  const errors = {};
  if (error) errors.nickname = error;
  else if (await db.get('SELECT 1 AS x FROM users WHERE username = ? AND id != ?', [value, req.user.id])) {
    errors.nickname = 'Nickname is already taken.';
  }

  if (errors.nickname) {
    return renderAccount(req, res, { status: 400, errors, values: { nickname: value } });
  }
  try {
    await db.run('UPDATE users SET username = ? WHERE id = ?', [value, req.user.id]);
  } catch (err) {
    if (!db.isUniqueError(err)) throw err;
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

router.post('/avatar', handleAvatarUpload, verifyCsrf, async (req, res) => {
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

  const previous = (await getAccount(req.user.id)).avatar;
  const key = await saveBuffer(req.file.buffer, ext, 'image');
  try {
    await db.run('UPDATE users SET avatar = ? WHERE id = ?', [key, req.user.id]);
  } catch (err) {
    await removeFile(key);
    throw err;
  }
  await removeFile(previous);
  req.flash('success', 'Picture saved.');
  res.redirect('/account');
});

router.post('/avatar/remove', verifyCsrf, async (req, res) => {
  const previous = (await getAccount(req.user.id)).avatar;
  await db.run('UPDATE users SET avatar = NULL WHERE id = ?', [req.user.id]);
  await removeFile(previous);
  req.flash('success', 'Picture removed.');
  res.redirect('/account');
});

// ---------- Password ----------
router.post('/password', verifyCsrf, async (req, res) => {
  const account = await getAccount(req.user.id);
  if (account.password_hash === '!') return res.status(404).render('404');

  const body = req.body || {};
  const errors = checkPassword(body.password, body.password2);
  const current = typeof body.current_password === 'string' ? body.current_password : '';
  const currentOk = await comparePassword(current.slice(0, 72), account.password_hash);
  if (!currentOk) errors.current_password = 'Your current password is not correct.';

  if (Object.keys(errors).length) return renderAccount(req, res, { status: 400, errors });

  await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [await hashPassword(body.password), req.user.id]);
  req.flash('success', 'Password changed.');
  res.redirect('/account');
});

// ---------- Delete account ----------
router.post('/delete', verifyCsrf, async (req, res, next) => {
  const account = await getAccount(req.user.id);
  const typed = typeof (req.body || {}).confirm === 'string' ? req.body.confirm.trim() : '';
  if (typed !== account.username) {
    return renderAccount(req, res, {
      status: 400,
      errors: { confirm: 'Type your nickname exactly to delete your account.' },
    });
  }

  // Collect every file first, delete the rows, and only then delete the files.
  const photos = await db.all(
    'SELECT p.filename FROM level_photos p JOIN levels l ON l.id = p.level_id WHERE l.user_id = ?',
    [account.id]
  );
  const music = await db.all('SELECT music_file FROM levels WHERE user_id = ? AND music_file IS NOT NULL', [
    account.id,
  ]);
  const files = [account.avatar, ...photos.map((r) => r.filename), ...music.map((r) => r.music_file)];

  const ownLevels = '(SELECT id FROM levels WHERE user_id = ?)';
  await db.batch([
    [`DELETE FROM comments WHERE level_id IN ${ownLevels}`, [account.id]],
    ['DELETE FROM comments WHERE user_id = ?', [account.id]],
    [`DELETE FROM level_photos WHERE level_id IN ${ownLevels}`, [account.id]],
    ['DELETE FROM levels WHERE user_id = ?', [account.id]],
    ['DELETE FROM users WHERE id = ?', [account.id]],
  ]);
  await Promise.all(files.map(removeFile));

  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.redirect('/levels');
  });
});

module.exports = router;
