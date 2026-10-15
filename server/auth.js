import crypto from 'node:crypto';
import { one, run, now } from './db.js';
import { config } from './config.js';

// In production the cookie uses the __Host- prefix: browsers then refuse any
// attempt to set or overwrite it from a subdomain (e.g. a game on play.example.com
// "tossing" a cookie at .example.com to log a player into someone else's account).
const COOKIE = config.secureCookies ? '__Host-snk_session' : 'snk_session';
const SESSION_DAYS = 30;
export const PASSWORD_MAX = 200;

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}
export function verifyPassword(pw, stored) {
  const [, s, h] = String(stored).split('$');
  if (!s || !h) return false;
  const hash = crypto.scryptSync(pw, Buffer.from(s, 'base64'), 64, { N: 16384, r: 8, p: 1 });
  const want = Buffer.from(h, 'base64');
  return want.length === hash.length && crypto.timingSafeEqual(hash, want);
}

export function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  run('INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)', token, userId, now() + SESSION_DAYS * 864e5);
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: config.secureCookies, maxAge: SESSION_DAYS * 864e5, path: '/' });
}
export function destroySession(req, res) {
  const t = readCookie(req, COOKIE);
  if (t) run('DELETE FROM sessions WHERE token=?', t);
  res.clearCookie(COOKIE, { path: '/', secure: config.secureCookies, httpOnly: true, sameSite: 'lax' });
}

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) {
      try { return decodeURIComponent(part.slice(i + 1).trim()); } catch { return null; }
    }
  }
  return null;
}

export function loadUser(req, _res, next) {
  const t = readCookie(req, COOKIE);
  req.user = null;
  if (t && t.length < 100) {
    const row = one(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token=? AND s.expires_at > ? AND u.banned=0`, t, now());
    if (row) req.user = row;
  }
  next();
}

export const requireUser = (req, res, next) =>
  req.user ? next() : res.status(401).json({ error: 'You need to be signed in for that.' });

// CSRF guard: every state-changing API call must carry a custom header (which forces a
// CORS preflight our API never approves) and, when the browser sends one, an Origin
// matching the site. Together these stop other sites *and* game pages from posting as you.
export function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (req.get('x-snackbar') !== '1' || (origin && origin !== config.siteOrigin)) {
    return res.status(403).json({ error: 'Request blocked.' });
  }
  next();
}

// The visitor's IP. Behind Cloudflare (tunnel or proxy) the real address arrives in
// CF-Connecting-IP; we only trust it when the request came through a local proxy.
export function clientIp(req) {
  const peer = req.socket.remoteAddress || '';
  const local = peer === '127.0.0.1' || peer === '::1' || peer === '::ffff:127.0.0.1';
  return (local && (req.get('cf-connecting-ip') || req.ip)) || peer || 'x';
}

// Tiny in-memory rate limiter (per key, sliding window). Good enough for one process.
const buckets = new Map();
export function rateLimit(key, max, windowMs) {
  const t = now();
  const arr = (buckets.get(key) || []).filter(x => t - x < windowMs);
  if (arr.length >= max) { buckets.set(key, arr); return false; }
  arr.push(t); buckets.set(key, arr);
  return true;
}
setInterval(() => {
  const t = now();
  for (const [k, v] of buckets) if (!v.some(x => t - x < 3600e3)) buckets.delete(k);
  run('DELETE FROM sessions WHERE expires_at < ?', t);
}, 600e3).unref();
