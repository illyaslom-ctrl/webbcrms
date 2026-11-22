# Backrooms Levels

A small website where people publish their own Backrooms levels through a fixed survey.

- Anyone can read the forum and every level, without an account.
- An account (username and password, or Google) is needed to publish levels and to write comments.
- Only the author can edit or delete a level. Only the writer can delete a comment.
- Account page: profile picture, nickname, password, delete account.

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
| `BASE_URL` | The public address of the site, for example `https://my-site.onrender.com`. Needed for Google sign-in when hosted. |
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

## Hosting

This is a server app, so it cannot run on GitHub Pages. It needs a host that runs Node.js. For real use the host must keep a disk for the data (`DATA_DIR`). Free plans without a disk lose accounts, levels and uploads on every restart or redeploy.
