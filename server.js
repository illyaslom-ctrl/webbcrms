'use strict';

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');

const db = require('./db');
const DbStore = require('./lib/sessionStore');
const storage = require('./lib/storage');
const { ensureUploadDir, UPLOAD_DIR } = require('./lib/fileCheck');
const requireLogin = require('./middleware/requireLogin');
const { csrfToken } = require('./middleware/csrf');
const flash = require('./middleware/flash');
const loadUser = require('./middleware/loadUser');
const google = require('./lib/google');
const i18n = require('./lib/i18n');

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

let secret = process.env.SESSION_SECRET;
if (!secret) {
  if (isProduction) {
    console.error('SESSION_SECRET is not set. Set it before starting in production.');
    process.exit(1);
  }
  secret = crypto.randomBytes(32).toString('hex');
  console.warn('SESSION_SECRET is not set. Using a random one; logins reset on restart.');
}

ensureUploadDir();

const app = express();
app.disable('x-powered-by');
if (isProduction) app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
        mediaSrc: ["'self'", 'https://res.cloudinary.com'],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
      },
    },
  })
);

// Public files: CSS and JS.
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));

app.use(express.urlencoded({ extended: false, limit: '50kb' }));

app.use(
  session({
    store: new DbStore(),
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use(loadUser);
app.use(csrfToken);
app.use(flash);

app.use(i18n.middleware);

app.use((req, res, next) => {
  res.locals.siteName = 'Backrooms Levels';
  res.locals.googleEnabled = google.enabled();
  res.locals.errors = {};
  res.locals.values = {};
  res.locals.fileUrl = storage.url;
  next();
});

// Language switch: /lang/ru or /lang/en, then back to the page the person was on.
app.get('/lang/:code', (req, res) => {
  if (i18n.LANGS.includes(req.params.code)) {
    res.cookie('lang', req.params.code, {
      maxAge: 365 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
    });
  }
  res.redirect(i18n.safeNext(req.query.next));
});

// Anyone can read levels, so photos, music and avatars are public too.
app.use('/uploads', express.static(UPLOAD_DIR, { index: false }));

app.get('/', (req, res) => res.redirect('/levels'));

app.use(require('./routes/auth'));
app.use(require('./routes/google'));
// Reading is public. The routes inside levels.js ask for a login where one is needed.
app.use('/levels', require('./routes/levels'));
app.use('/profile', requireLogin, require('./routes/profile'));
app.use('/account', requireLogin, require('./routes/account'));

app.use((req, res) => {
  res.status(404).render('404');
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return;
  if (err.csrf) {
    return res.status(403).render('error', {
      message: 'Your form has expired. Please go back, reload the page and try again.',
    });
  }
  res.status(500).render('error', { message: 'Something went wrong. Please try again.' });
});

db.init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backrooms Levels is running at http://localhost:${PORT}`);
      console.log(`Database: ${db.isRemote ? 'Turso' : 'local file'}. Uploads: ${storage.usesCloudinary ? 'Cloudinary' : 'local disk'}.`);
      if (isProduction && !(db.isRemote && storage.usesCloudinary)) {
        console.warn('Warning: data or uploads are stored on this server\'s disk. Many hosts erase it on restart.');
      }
    });
  })
  .catch((err) => {
    console.error('Could not start the database:', err.message);
    process.exit(1);
  });
