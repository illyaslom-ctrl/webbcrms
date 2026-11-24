# Backrooms Levels

A small website where people publish their own Backrooms levels through a fixed survey.

- Anyone can read the forum and every level, without an account.
- An account (username and password, or Google) is needed to publish levels and to write comments.
- Only the author can edit or delete a level. Only the writer can delete a comment.
- Account page: profile picture, nickname, password, delete account.

Built with Node.js, Express, EJS, SQLite through libSQL (a local file, or Turso when hosted), Cloudinary for uploads when hosted, bcryptjs, multer, helmet and express-rate-limit.

## Run it on your computer

1. Install Node.js 18 or newer from https://nodejs.org
2. In this folder run:

```
npm install
npm start
```

3. Open http://localhost:3000

With no extra settings the database is created in `data/app.db` and uploads go to `public/uploads/` (both are created on start and are not stored in git). Logins are kept in the same database.

## Settings (environment variables)

| Name | What it does |
| --- | --- |
| `SESSION_SECRET` | Long random text used to sign login cookies. Required when `NODE_ENV=production`. |
| `NODE_ENV` | Set to `production` when deployed over HTTPS (turns on secure cookies). |
| `DATA_DIR` | Folder for the database and uploads (`app.db` and `uploads/`). Point it at a persistent disk when hosting. Default: `data/` and `public/uploads/`. |
| `PORT` | Port to listen on. Default 3000. |
| `BASE_URL` | The public address of the site, for example `https://my-site.onrender.com`. Needed for Google sign-in when hosted. |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Keep the database (and logins) in Turso, so they survive restarts. Leave them out to use the local file. |
| `CLOUDINARY_URL` | Keep uploads in Cloudinary, in the form `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`. Leave it out to use the local disk. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Turn on "Continue with Google". Leave them out and the button is hidden. |

## Google sign-in setup

1. Open https://console.cloud.google.com and create a project.
2. Go to **APIs & Services > OAuth consent screen**, choose **External**, and fill in the app name and your email.
3. Go to **Credentials > Create credentials > OAuth client ID**, type **Web application**.
4. Under **Authorized redirect URIs** add both:
   - `http://localhost:3000/auth/google/callback`
   - `https://YOUR-SITE-ADDRESS/auth/google/callback`
5. Copy the client ID and secret into the environment variables above, and set `BASE_URL`.

While the consent screen is in "Testing" mode only the test users you list there can sign in. Click **Publish app** to let everyone in.

## Free hosting that keeps your data (Turso + Cloudinary)

A free web host such as Render erases its own disk on every restart. To keep everything, put the data somewhere else:

1. **Turso** (database): create a free account at https://turso.tech, create a database, then copy its URL (starts with `libsql://`) and create a token. Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` on the host.
2. **Cloudinary** (photos, music, avatars): create a free account at https://cloudinary.com, open **Settings > API Keys** (or the dashboard) and copy the **API environment variable** (starts with `cloudinary://`). Set it as `CLOUDINARY_URL` on the host.

The tables are created automatically on the first start. When `NODE_ENV=production` and one of the two is missing, the server prints a warning in its log.

Files are checked on the server (type, size, no videos) before they go to Cloudinary. Deleting a level, photo, avatar or account also deletes the files from Cloudinary.

## Other hosting notes

This is a server app, so it cannot run on GitHub Pages. It needs a host that runs Node.js. Without Turso and Cloudinary, the host must keep a disk for the data (`DATA_DIR`), otherwise accounts, levels and uploads are lost on every restart or redeploy.
