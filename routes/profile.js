'use strict';

const express = require('express');
const db = require('../db');

const router = express.Router();

const MY_LEVELS = `
  SELECT l.id, l.name, l.level_number, l.danger_rating, l.created_at, u.username,
    (SELECT filename FROM level_photos p WHERE p.level_id = l.id ORDER BY position LIMIT 1) AS cover
  FROM levels l JOIN users u ON u.id = l.user_id
  WHERE l.user_id = ?
  ORDER BY l.created_at DESC, l.id DESC`;

router.get('/', async (req, res) => {
  res.render('profile', { levels: await db.all(MY_LEVELS, [req.user.id]) });
});

module.exports = router;
