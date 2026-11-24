'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Where uploaded files live:
//   Cloudinary settings present -> Cloudinary (files survive restarts and redeploys).
//   otherwise                   -> a folder on this server's disk.
// The database stores one "key" per file. It is either a file name (disk) or a
// full https://res.cloudinary.com/... address (Cloudinary). url() handles both.

const UPLOAD_DIR = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, '..', 'public', 'uploads');

const FOLDER = 'backrooms-levels';
const MIME = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
};

// CLOUDINARY_URL looks like cloudinary://API_KEY:API_SECRET@CLOUD_NAME
function readConfig() {
  let cloud = process.env.CLOUDINARY_CLOUD_NAME;
  let key = process.env.CLOUDINARY_API_KEY;
  let secret = process.env.CLOUDINARY_API_SECRET;
  if (process.env.CLOUDINARY_URL) {
    try {
      const u = new URL(process.env.CLOUDINARY_URL);
      if (u.protocol === 'cloudinary:') {
        cloud = cloud || u.hostname;
        key = key || decodeURIComponent(u.username);
        secret = secret || decodeURIComponent(u.password);
      }
    } catch (err) {
      console.error('CLOUDINARY_URL is not valid.');
    }
  }
  if (!cloud || !key || !secret) return null;
  return { cloud, key, secret };
}

const cloudinary = readConfig();
// The API address can be changed only to test against a fake server.
const API_BASE = process.env.CLOUDINARY_API_BASE || 'https://api.cloudinary.com';

function sign(params) {
  const text = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(text + cloudinary.secret).digest('hex');
}

async function readJson(res) {
  try {
    return await res.json();
  } catch (err) {
    return {};
  }
}

async function cloudSave(buffer, ext, kind) {
  // Cloudinary files audio under "video".
  const resource = kind === 'audio' ? 'video' : 'image';
  const publicId = `${FOLDER}/${crypto.randomUUID()}`;
  const timestamp = String(Math.floor(Date.now() / 1000));

  const form = new FormData();
  form.set('file', new Blob([buffer], { type: MIME[ext] || 'application/octet-stream' }), `upload.${ext}`);
  form.set('api_key', cloudinary.key);
  form.set('timestamp', timestamp);
  form.set('public_id', publicId);
  form.set('signature', sign({ public_id: publicId, timestamp }));

  const res = await fetch(`${API_BASE}/v1_1/${encodeURIComponent(cloudinary.cloud)}/${resource}/upload`, {
    method: 'POST',
    body: form,
  });
  const body = await readJson(res);
  if (!res.ok || typeof body.secure_url !== 'string') {
    const reason = body && body.error && body.error.message ? body.error.message : `status ${res.status}`;
    throw new Error(`Cloudinary upload failed: ${reason}`);
  }
  return body.secure_url;
}

const CLOUD_URL = /^https:\/\/res\.cloudinary\.com\/([^/]+)\/(image|video)\/upload\/(?:v\d+\/)?(.+?)(?:\.[A-Za-z0-9]+)?$/;

async function cloudRemove(key) {
  const m = CLOUD_URL.exec(key);
  // Only ever delete files that this site uploaded.
  if (!m || m[1] !== cloudinary.cloud || !m[3].startsWith(FOLDER + '/')) return;
  const publicId = m[3];
  const timestamp = String(Math.floor(Date.now() / 1000));
  const form = new FormData();
  form.set('public_id', publicId);
  form.set('api_key', cloudinary.key);
  form.set('timestamp', timestamp);
  form.set('signature', sign({ public_id: publicId, timestamp }));
  const res = await fetch(`${API_BASE}/v1_1/${encodeURIComponent(cloudinary.cloud)}/${m[2]}/destroy`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(`status ${res.status}`);
}

function diskSave(buffer, ext) {
  const filename = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
  return filename;
}

const SAFE_NAME = /^[0-9a-f-]{36}\.(jpg|png|webp|mp3|ogg|wav)$/;

function diskRemove(filename) {
  if (!SAFE_NAME.test(filename)) return;
  try {
    fs.unlinkSync(path.join(UPLOAD_DIR, filename));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Could not delete file', filename, err.message);
  }
}

function ensureReady() {
  if (!cloudinary) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Saves a file whose type was already checked. Resolves with the key to store in the database.
// kind is 'image' or 'audio'. The original file name is never used.
async function save(buffer, ext, kind) {
  if (cloudinary) return cloudSave(buffer, ext, kind);
  return diskSave(buffer, ext);
}

// Never throws: a file that cannot be deleted must not break the page.
async function remove(key) {
  if (!key) return;
  try {
    if (key.startsWith('https://')) {
      if (cloudinary) await cloudRemove(key);
    } else {
      diskRemove(key);
    }
  } catch (err) {
    console.error('Could not delete file', key, err.message);
  }
}

// The address the browser should use for a stored key.
function url(key) {
  if (!key) return '';
  return key.startsWith('https://') ? key : `/uploads/${key}`;
}

module.exports = { UPLOAD_DIR, usesCloudinary: Boolean(cloudinary), ensureReady, save, remove, url };
