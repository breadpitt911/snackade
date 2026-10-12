import crypto from 'node:crypto';
import { one, run, now } from './db.js';
import { config } from './config.js';

const COOKIE = 'snk_session';
const SESSION_DAYS = 30;

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}
export function verifyPassword(pw, stored) {
  const [, s, h] = stored.split('$');
  const hash = crypto.scryptSync(pw, Buffer.from(s, 'base64'), 64, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(hash, Buffer.from(h, 'base64'));
}

export function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  run('INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)', token, userId, now() + SESSION_DAYS * 864e5);
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: config.secureCookies, maxAge: SESSION_DAYS * 864e5, path: '/' });
}
export function destroySession(req, res) {
  const t = readCookie(req, COOKIE);
  if (t) run('DELETE FROM sessions WHERE token=?', t);
  res.clearCookie(COOKIE, { path: '/' });
}

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

export function loadUser(req, _res, next) {
  const t = readCookie(req, COOKIE);
  req.user = null;
  if (t) {
    const row = one(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token=? AND s.expires_at > ?`, t, now());
    if (row) req.user = row;
  }
  next();
}

export const requireUser = (req, res, next) =>
  req.user ? next() : res.status(401).json({ error: 'Sign in to do that.' });

// CSRF guard: every state-changing API call must carry a custom header, which
// browsers will not let another site attach to a cross-origin form post.
export function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('x-snackade') !== '1') return res.status(403).json({ error: 'Missing request header.' });
  next();
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
setInterval(() => { const t = now(); for (const [k, v] of buckets) if (!v.some(x => t - x < 3600e3)) buckets.delete(k); }, 600e3).unref();
