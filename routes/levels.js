'use strict';

const express = require('express');
const multer = require('multer');
const db = require('../db');
const { verifyCsrf } = require('../middleware/csrf');
const { validateLevel } = require('../lib/validate');
const { checkPhoto, checkMusic, saveBuffer, removeFile } = require('../lib/fileCheck');

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

const countLevels = db.prepare(`SELECT COUNT(*) AS n FROM levels WHERE name LIKE ? ESCAPE '\\'`);
const listLevels = db.prepare(
  `${CARD_SELECT} WHERE l.name LIKE ? ESCAPE '\\' ORDER BY l.created_at DESC, l.id DESC LIMIT ? OFFSET ?`
);
const getLevel = db.prepare(
  `SELECT l.*, u.username FROM levels l JOIN users u ON u.id = l.user_id WHERE l.id = ?`
);
const getPhotos = db.prepare('SELECT id, filename, position FROM level_photos WHERE level_id = ? ORDER BY position');
const insertLevel = db.prepare(`
  INSERT INTO levels (user_id, name, level_number, description, entities, entries, exits, features,
    lovely_places, danger_areas, danger_rating, music_name, music_file)
  VALUES (@user_id, @name, @level_number, @description, @entities, @entries, @exits, @features,
    @lovely_places, @danger_areas, @danger_rating, @music_name, @music_file)`);
const updateLevel = db.prepare(`
  UPDATE levels SET name=@name, level_number=@level_number, description=@description,
    entities=@entities, entries=@entries, exits=@exits, features=@features,
    lovely_places=@lovely_places, danger_areas=@danger_areas, danger_rating=@danger_rating,
    music_name=@music_name, music_file=@music_file, updated_at=datetime('now')
  WHERE id=@id`);
const insertPhoto = db.prepare('INSERT INTO level_photos (level_id, filename, position) VALUES (?, ?, ?)');
const deletePhoto = db.prepare('DELETE FROM level_photos WHERE id = ? AND level_id = ?');
const setPosition = db.prepare('UPDATE level_photos SET position = ? WHERE id = ?');
const deleteLevel = db.prepare('DELETE FROM levels WHERE id = ?');

function notFound(res) {
  return res.status(404).render('404');
}

function parseId(value) {
  return /^\d{1,9}$/.test(value) ? Number(value) : null;
}

// Loads the level if it exists and belongs to the logged-in user. Otherwise 404.
function loadOwnLevel(req, res) {
  const id = parseId(req.params.id);
  const level = id ? getLevel.get(id) : undefined;
  if (!level || level.user_id !== req.session.user.id) {
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
router.get('/', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
  const like = `%${q.replace(/[\\%_]/g, (c) => '\\' + c)}%`;
  const total = countLevels.get(like).n;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  let page = parseInt(req.query.page, 10);
  if (!Number.isInteger(page) || page < 1) page = 1;
  if (page > pages) page = pages;
  const levels = listLevels.all(like, PAGE_SIZE, (page - 1) * PAGE_SIZE);
  res.render('levels/index', { levels, q, page, pages, total });
});

// ---------- New ----------
router.get('/new', (req, res) => {
  res.render('levels/new', { values: {}, errors: {}, filesNote: null });
});

router.post('/', handleUpload, verifyCsrf, (req, res) => {
  const form = checkForm(req, []);
  if (Object.keys(form.errors).length) {
    return res.status(400).render('levels/new', {
      values: form.values,
      errors: form.errors,
      filesNote: form.hadFiles ? 'Please select your photos again.' : null,
    });
  }

  const written = [];
  try {
    const photoNames = form.photos.map((file, i) => {
      const name = saveBuffer(file.buffer, form.photoInfo[i].ext);
      written.push(name);
      return name;
    });
    let musicFile = null;
    if (form.music) {
      musicFile = saveBuffer(form.music.buffer, form.musicInfo.ext);
      written.push(musicFile);
    }

    const id = db.transaction(() => {
      const levelId = insertLevel.run({
        ...form.data,
        user_id: req.session.user.id,
        music_file: musicFile,
      }).lastInsertRowid;
      photoNames.forEach((name, i) => insertPhoto.run(levelId, name, i));
      return levelId;
    })();

    req.flash('success', 'Level published.');
    res.redirect(`/levels/${id}`);
  } catch (err) {
    written.forEach(removeFile);
    throw err;
  }
});

// ---------- Show ----------
router.get('/:id', (req, res) => {
  const id = parseId(req.params.id);
  const level = id ? getLevel.get(id) : undefined;
  if (!level) return notFound(res);
  res.render('levels/show', {
    level,
    photos: getPhotos.all(level.id),
    isAuthor: level.user_id === req.session.user.id,
  });
});

// ---------- Edit ----------
router.get('/:id/edit', (req, res) => {
  const level = loadOwnLevel(req, res);
  if (!level) return;
  res.render('levels/edit', {
    level,
    photos: getPhotos.all(level.id),
    values: levelToValues(level),
    errors: {},
    filesNote: null,
  });
});

router.post('/:id/edit', handleUpload, verifyCsrf, (req, res) => {
  const level = loadOwnLevel(req, res);
  if (!level) return;
  const existing = getPhotos.all(level.id);
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

  const written = [];
  try {
    const photoNames = form.photos.map((file, i) => {
      const name = saveBuffer(file.buffer, form.photoInfo[i].ext);
      written.push(name);
      return name;
    });
    let musicFile = level.music_file;
    if (form.music) {
      musicFile = saveBuffer(form.music.buffer, form.musicInfo.ext);
      written.push(musicFile);
    }

    db.transaction(() => {
      updateLevel.run({ ...form.data, id: level.id, music_file: musicFile });
      form.removeIds.forEach((photoId) => deletePhoto.run(photoId, level.id));
      let position = 0;
      getPhotos.all(level.id).forEach((p) => setPosition.run(position++, p.id));
      photoNames.forEach((name) => insertPhoto.run(level.id, name, position++));
    })();

    // Only now, after the save worked, remove the files that are no longer used.
    existing.filter((p) => form.removeIds.includes(p.id)).forEach((p) => removeFile(p.filename));
    if (form.music && level.music_file) removeFile(level.music_file);

    req.flash('success', 'Changes saved.');
    res.redirect(`/levels/${level.id}`);
  } catch (err) {
    written.forEach(removeFile);
    throw err;
  }
});

// ---------- Delete ----------
router.post('/:id/delete', verifyCsrf, (req, res) => {
  const level = loadOwnLevel(req, res);
  if (!level) return;
  const photos = getPhotos.all(level.id);
  deleteLevel.run(level.id);
  photos.forEach((p) => removeFile(p.filename));
  if (level.music_file) removeFile(level.music_file);
  req.flash('success', 'Level deleted.');
  res.redirect('/levels');
});

module.exports = router;
