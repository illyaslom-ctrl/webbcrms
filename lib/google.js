'use strict';

// Google sign-in (OAuth 2.0 authorization code flow), written without extra packages.
// Switched on only when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set.

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
// The two URLs below can be replaced only to test against a fake Google server.
const TOKEN_URL = process.env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token';
const USERINFO_URL =
  process.env.GOOGLE_USERINFO_URL || 'https://openidconnect.googleapis.com/v1/userinfo';

function enabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function redirectUri(req) {
  const base = process.env.BASE_URL
    ? process.env.BASE_URL.replace(/\/+$/, '')
    : `${req.protocol}://${req.get('host')}`;
  return `${base}/auth/google/callback`;
}

function authUrl(req, state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(req),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  return `${AUTH_URL}?${params}`;
}

async function fetchProfile(req, code) {
  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(req),
      grant_type: 'authorization_code',
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!tokenRes.ok) throw new Error(`Google token request failed (${tokenRes.status})`);
  const tokens = await tokenRes.json();
  if (!tokens.access_token) throw new Error('Google did not return an access token');

  const infoRes = await fetch(USERINFO_URL, {
    headers: { authorization: `Bearer ${tokens.access_token}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!infoRes.ok) throw new Error(`Google profile request failed (${infoRes.status})`);
  return infoRes.json();
}

module.exports = { enabled, authUrl, fetchProfile };
