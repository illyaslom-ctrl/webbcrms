'use strict';

const express = require('express');
const multer = require('multer');
const db = require('../db');
const rateLimit = require('express-rate-limit');
const requireLogin = require('../middleware/requireLogin');
const { verifyCsrf } = require('../middleware/csrf');
const { validateLevel, validateComment, COMMENT_MAX } = require('../lib/validate');
const { checkPhoto, checkMusic, saveAll, removeFile } = require('../lib/fileCheck');

const router = express.Router();

const PAGE_SIZE = 12;
const MAX_PHOTOS = 10;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 20, fields: 40 },
}).fields([
  { name: 'photos', maxCount: MAX_PHOTOS },
  { name: 'music_file', maxCount: 1 },
]);

// Upload problems become form errors instead of crashing the request.
function handleUpload(req, res, next) {
  upload(req, res, (err) => {
    if (err) {
      req.uploadError = err;
      req.files = {};
      req.body = req.body || {};
    }
    next();
  });
}

function uploadErrorMessage(err) {
  if (err.code === 'LIMIT_UNEXPECTED_FILE') return 'You can upload up to 10 photos.';
  if (err.code === 'LIMIT_FILE_SIZE') return 'A file is too big. Photos: 8 MB. Music: 15 MB.';
  return 'The upload failed. Please try again.';
}

const CARD_SELECT = `
  SELECT l.id, l.name, l.level_number, l.danger_rating, l.created_at, u.username,
    (SELECT filename FROM level_photos p WHERE p.level_id = l.id ORDER BY position LIMIT 1) AS cover
  FROM levels l JOIN users u ON u.id = l.user_id`;

const COUNT_LEVELS = `SELECT COUNT(*) AS n FROM levels WHERE name LIKE ? ESCAPE '\\'`;
const LIST_LEVELS = `${CARD_SELECT} WHERE l.name LIKE ? ESCAPE '\\' ORDER BY l.created_at DESC, l.id DESC LIMIT ? OFFSET ?`;
const GET_LEVEL = `SELECT l.*, u.username FROM levels l JOIN users u ON u.id = l.user_id WHERE l.id = ?`;
const GET_PHOTOS = 'SELECT id, filename, position FROM level_photos WHERE level_id = ? ORDER BY position';
const GET_COMMENTS = `
  SELECT c.id, c.body, c.created_at, c.user_id, u.username, u.avatar
  FROM comments c JOIN users u ON u.id = c.user_id
  WHERE c.level_id = ? ORDER BY c.created_at, c.id`;

const getLevel = (id) => db.get(GET_LEVEL, [id]);
const getPhotos = (levelId) => db.all(GET_PHOTOS, [levelId]);

const LEVEL_COLUMNS = [
  'name', 'level_number', 'description', 'entities', 'entries', 'exits', 'features',
  'lovely_places', 'danger_areas', 'danger_rating', 'music_name',
];

function notFound(res) {
  return res.status(404).render('404');
}

function parseId(value) {
  return /^\d{1,9}$/.test(value) ? Number(value) : null;
}

// Loads the level if it exists and belongs to the logged-in user. Otherwise 404.
async function loadOwnLevel(req, res) {
  const id = parseId(req.params.id);
  const level = id ? await getLevel(id) : undefined;
  if (!level || level.user_id !== req.user.id) {
    notFound(res);
    return null;
  }
  return level;
}

function levelToValues(level) {
  const v = {};
  for (const key of [
    'name', 'description', 'entities', 'entries', 'exits', 'features',
    'lovely_places', 'danger_areas', 'music_name',
  ]) {
    v[key] = level[key] || '';
  }
  v.level_number = level.level_number === null ? '' : String(level.level_number);
  v.danger_rating = level.danger_rating === null ? '' : String(level.danger_rating);
  return v;
}

// Checks the text fields and every uploaded file. Writes nothing.
function checkForm(req, existingPhotos) {
  const { errors, values, data } = validateLevel(req.body || {});
  const photos = (req.files && req.files.photos) || [];
  const music = req.files && req.files.music_file ? req.files.music_file[0] : null;

  let removeIds = [];
  if (existingPhotos.length) {
    const raw = req.body.remove_photos;
    const asked = (Array.isArray(raw) ? raw : raw ? [raw] : []).map(Number);
    removeIds = existingPhotos.filter((p) => asked.includes(p.id)).map((p) => p.id);
  }

  const photoInfo = [];
  let musicInfo = null;
  if (req.uploadError) {
    errors.photos = uploadErrorMessage(req.uploadError);
  } else {
    const total = existingPhotos.length - removeIds.length + photos.length;
    if (total > MAX_PHOTOS) {
      errors.photos = 'You can have at most 10 photos in total.';
    } else {
      for (const file of photos) {
        const result = checkPhoto(file);
        if (result.error) {
          errors.photos = result.error;
          break;
        }
        photoInfo.push(result);
      }
    }
    if (music) {
      const result = checkMusic(music);
      if (result.error) errors.music_file = result.error;
      else musicInfo = result;
    }
  }

  return {
    errors,
    values,
    data,
    photos,
    photoInfo,
    music,
    musicInfo,
    removeIds,
    hadFiles: photos.length > 0 || Boolean(music) || Boolean(req.uploadError),
  };
}

// ---------- Forum list ----------
router.get('/', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
  const like = `%${q.replace(/[\\%_]/g, (c) => '\\' + c)}%`;
  const total = (await db.get(COUNT_LEVELS, [like])).n;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  let page = parseInt(req.query.page, 10);
  if (!Number.isInteger(page) || page < 1) page = 1;
  if (page > pages) page = pages;
  const levels = await db.all(LIST_LEVELS, [like, PAGE_SIZE, (page - 1) * PAGE_SIZE]);
  res.render('levels/index', { levels, q, page, pages, total });
});

// ---------- New ----------
router.get('/new', requireLogin, (req, res) => {
  res.render('levels/new', { values: {}, errors: {}, filesNote: null });
});

router.post('/', requireLogin, handleUpload, verifyCsrf, async (req, res) => {
  const form = checkForm(req, []);
  if (Object.keys(form.errors).length) {
    return res.status(400).render('levels/new', {
      values: form.values,
      errors: form.errors,
      filesNote: form.hadFiles ? 'Please select your photos again.' : null,
    });
  }

  // Photos first, then the music file (if any). Nothing is in the database yet.
  const items = form.photos.map((file, i) => ({ buffer: file.buffer, ext: form.photoInfo[i].ext, kind: 'image' }));
  if (form.music) items.push({ buffer: form.music.buffer, ext: form.musicInfo.ext, kind: 'audio' });
  const keys = await saveAll(items);
  const photoKeys = keys.slice(0, form.photos.length);
  const musicFile = form.music ? keys[keys.length - 1] : null;

  try {
    // One all-or-nothing transaction. The photos point at the level inserted just before them.
    const statements = [
      [
        `INSERT INTO levels (user_id, ${LEVEL_COLUMNS.join(', ')}, music_file)
         VALUES (?, ${LEVEL_COLUMNS.map(() => '?').join(', ')}, ?)`,
        [req.user.id, ...LEVEL_COLUMNS.map((c) => form.data[c]), musicFile],
      ],
      ...photoKeys.map((key, i) => [
        'INSERT INTO level_photos (level_id, filename, position) VALUES ((SELECT MAX(id) FROM levels WHERE user_id = ?), ?, ?)',
        [req.user.id, key, i],
      ]),
    ];
    const results = await db.batch(statements);
    req.flash('success', 'Level published.');
    res.redirect(`/levels/${results[0].lastInsertRowid}`);
  } catch (err) {
    await Promise.all(keys.map(removeFile));
    throw err;
  }
});

// ---------- Show ----------
router.get('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const level = id ? await getLevel(id) : undefined;
  if (!level) return notFound(res);
  const [photos, comments] = await Promise.all([getPhotos(level.id), db.all(GET_COMMENTS, [level.id])]);
  res.render('levels/show', {
    level,
    photos,
    comments,
    commentMax: COMMENT_MAX,
    isAuthor: Boolean(req.user) && level.user_id === req.user.id,
  });
});

// ---------- Comments ----------
const commentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    req.flash('error', 'You are commenting too fast. Please wait a few minutes.');
    res.redirect(`/levels/${encodeURIComponent(req.params.id)}#comments`);
  },
});

router.post('/:id/comments', requireLogin, commentLimiter, verifyCsrf, async (req, res) => {
  const id = parseId(req.params.id);
  const level = id ? await getLevel(id) : undefined;
  if (!level) return notFound(res);

  const { text, error } = validateComment((req.body || {}).body);
  if (error) {
    req.flash('error', error);
  } else {
    await db.run('INSERT INTO comments (level_id, user_id, body) VALUES (?, ?, ?)', [level.id, req.user.id, text]);
    req.flash('success', 'Comment posted.');
  }
  res.redirect(`/levels/${level.id}#comments`);
});

// Only the person who wrote a comment can delete it.
router.post('/:id/comments/:commentId/delete', requireLogin, verifyCsrf, async (req, res) => {
  const id = parseId(req.params.id);
  const commentId = parseId(req.params.commentId);
  const comment = commentId
    ? await db.get('SELECT id, level_id, user_id FROM comments WHERE id = ?', [commentId])
    : undefined;
  if (!id || !comment || comment.level_id !== id || comment.user_id !== req.user.id) {
    return notFound(res);
  }
  await db.run('DELETE FROM comments WHERE id = ?', [comment.id]);
  req.flash('success', 'Comment deleted.');
  res.redirect(`/levels/${id}#comments`);
});

// ---------- Edit ----------
router.get('/:id/edit', requireLogin, async (req, res) => {
  const level = await loadOwnLevel(req, res);
  if (!level) return;
  res.render('levels/edit', {
    level,
    photos: await getPhotos(level.id),
    values: levelToValues(level),
    errors: {},
    filesNote: null,
  });
});

router.post('/:id/edit', requireLogin, handleUpload, verifyCsrf, async (req, res) => {
  const level = await loadOwnLevel(req, res);
  if (!level) return;
  const existing = await getPhotos(level.id);
  const form = checkForm(req, existing);

  if (Object.keys(form.errors).length) {
    return res.status(400).render('levels/edit', {
      level,
      photos: existing,
      values: form.values,
      errors: form.errors,
      filesNote: form.hadFiles ? 'Please select your photos again.' : null,
    });
  }

  const items = form.photos.map((file, i) => ({ buffer: file.buffer, ext: form.photoInfo[i].ext, kind: 'image' }));
  if (form.music) items.push({ buffer: form.music.buffer, ext: form.musicInfo.ext, kind: 'audio' });
  const keys = await saveAll(items);
  const photoKeys = keys.slice(0, form.photos.length);
  const musicFile = form.music ? keys[keys.length - 1] : level.music_file;

  try {
    const kept = existing.filter((p) => !form.removeIds.includes(p.id));
    const statements = [
      [
        `UPDATE levels SET ${LEVEL_COLUMNS.map((c) => `${c} = ?`).join(', ')}, music_file = ?,
           updated_at = datetime('now') WHERE id = ?`,
        [...LEVEL_COLUMNS.map((c) => form.data[c]), musicFile, level.id],
      ],
      ...form.removeIds.map((photoId) => ['DELETE FROM level_photos WHERE id = ? AND level_id = ?', [photoId, level.id]]),
      ...kept.map((p, i) => ['UPDATE level_photos SET position = ? WHERE id = ?', [i, p.id]]),
      ...photoKeys.map((key, i) => [
        'INSERT INTO level_photos (level_id, filename, position) VALUES (?, ?, ?)',
        [level.id, key, kept.length + i],
      ]),
    ];
    await db.batch(statements);
  } catch (err) {
    await Promise.all(keys.map(removeFile));
    throw err;
  }

  // Only now, after the save worked, remove the files that are no longer used.
  await Promise.all(existing.filter((p) => form.removeIds.includes(p.id)).map((p) => removeFile(p.filename)));
  if (form.music && level.music_file) await removeFile(level.music_file);

  req.flash('success', 'Changes saved.');
  res.redirect(`/levels/${level.id}`);
});

// ---------- Delete ----------
router.post('/:id/delete', requireLogin, verifyCsrf, async (req, res) => {
  const level = await loadOwnLevel(req, res);
  if (!level) return;
  const photos = await getPhotos(level.id);
  await db.batch([
    ['DELETE FROM comments WHERE level_id = ?', [level.id]],
    ['DELETE FROM level_photos WHERE level_id = ?', [level.id]],
    ['DELETE FROM levels WHERE id = ?', [level.id]],
  ]);
  await Promise.all(photos.map((p) => removeFile(p.filename)));
  if (level.music_file) await removeFile(level.music_file);
  req.flash('success', 'Level deleted.');
  res.redirect('/levels');
});

module.exports = router;
