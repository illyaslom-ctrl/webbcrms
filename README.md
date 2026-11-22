# Backrooms Levels

A small website where registered people publish their own Backrooms levels through a fixed survey. Logged-in users can browse and read every level; only the author can edit or delete one.

Built with Node.js, Express, EJS, SQLite (better-sqlite3), bcryptjs, multer, helmet and express-rate-limit.

## Run it on your computer

1. Install Node.js 18 or newer from https://nodejs.org
2. In this folder run:

```
npm install
npm start
```

3. Open http://localhost:3000

The database is created in `data/app.db` and uploads go to `public/uploads/` (both are created on start and are not stored in git).

## Settings (environment variables)

| Name | What it does |
| --- | --- |
| `SESSION_SECRET` | Long random text used to sign login cookies. Required when `NODE_ENV=production`. |
| `NODE_ENV` | Set to `production` when deployed over HTTPS (turns on secure cookies). |
| `DATA_DIR` | Folder for the database and uploads (`app.db` and `uploads/`). Point it at a persistent disk when hosting. Default: `data/` and `public/uploads/`. |
| `PORT` | Port to listen on. Default 3000. |

## Hosting

This is a server app, so it cannot run on GitHub Pages. It needs a host that runs Node.js and keeps a disk for `data/` and `public/uploads/`.

