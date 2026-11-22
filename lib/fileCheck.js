'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
const PHOTO_MAX = 8 * 1024 * 1024;
const MUSIC_MAX = 15 * 1024 * 1024;

const VIDEO_MESSAGE = 'Videos are not allowed. Upload images only.';
const BAD_IMAGE = 'This file is not a valid image';
const BAD_AUDIO = 'This file is not a valid audio file';

function startsWith(buf, bytes, offset = 0) {
  if (buf.length < offset + bytes.length) return false;
  return bytes.every((b, i) => buf[offset + i] === b);
}

function ascii(s) {
  return [...s].map((c) => c.charCodeAt(0));
}

// Looks at the first bytes only. Never trusts the file name or the MIME type.
function detect(buf) {
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return { kind: 'image', ext: 'jpg' };
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { kind: 'image', ext: 'png' };
  }
  if (startsWith(buf, ascii('RIFF')) && startsWith(buf, ascii('WEBP'), 8)) {
    return { kind: 'image', ext: 'webp' };
  }
  if (startsWith(buf, ascii('RIFF')) && startsWith(buf, ascii('WAVE'), 8)) {
    return { kind: 'audio', ext: 'wav' };
  }
  if (startsWith(buf, ascii('OggS'))) return { kind: 'audio', ext: 'ogg' };
  if (
    startsWith(buf, ascii('ID3')) ||
    (buf.length > 1 && buf[0] === 0xff && [0xfb, 0xf3, 0xf2].includes(buf[1]))
  ) {
    return { kind: 'audio', ext: 'mp3' };
  }
  if (startsWith(buf, ascii('ftyp'), 4) || startsWith(buf, [0x1a, 0x45, 0xdf, 0xa3])) {
    return { kind: 'video' };
  }
  return null;
}

function checkPhoto(file) {
  if (file.size > PHOTO_MAX || file.buffer.length > PHOTO_MAX) {
    return { error: 'Each photo must be 8 MB or smaller.' };
  }
  const found = detect(file.buffer);
  if (found && found.kind === 'video') return { error: VIDEO_MESSAGE };
  if (!found || found.kind !== 'image') return { error: BAD_IMAGE };
  return { ext: found.ext };
}

function checkMusic(file) {
  if (file.size > MUSIC_MAX || file.buffer.length > MUSIC_MAX) {
    return { error: 'The music file must be 15 MB or smaller.' };
  }
  const found = detect(file.buffer);
  if (!found || found.kind !== 'audio') return { error: BAD_AUDIO };
  return { ext: found.ext };
}

function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Random name from the detected type. The original file name is never used.
function saveBuffer(buffer, ext) {
  const filename = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
  return filename;
}

const SAFE_NAME = /^[0-9a-f-]{36}\.(jpg|png|webp|mp3|ogg|wav)$/;

function removeFile(filename) {
  if (!filename || !SAFE_NAME.test(filename)) return;
  try {
    fs.unlinkSync(path.join(UPLOAD_DIR, filename));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Could not delete file', filename, err.message);
  }
}

module.exports = {
  UPLOAD_DIR,
  checkPhoto,
  checkMusic,
  ensureUploadDir,
  saveBuffer,
  removeFile,
  detect,
};
