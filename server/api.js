import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { config, coversDir } from './config.js';
import { one, all, run, tx, now, today } from './db.js';
import { hashPassword, verifyPassword, createSession, destroySession, requireUser, rateLimit } from './auth.js';
import { RULES, LEVELS, BADGES, award, checkBadges, touchStreak, progress, forUser } from './xp.js';
import { processUpload, uniqueSlug, removeGameFiles, CATEGORIES, KINDS, UploadError } from './uploads.js';

export const api = express.Router();
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });
const ip = req => req.ip || 'x';

// ---------- serializers ----------
const parseAvatar = s => { try { return JSON.parse(s); } catch { return {}; } };
export function publicUser(u) {
  if (!u) return null;
  return { username: u.username, displayName: u.display_name, avatar: parseAvatar(u.avatar), level: u.level, xp: u.xp, isAdmin: !!u.is_admin };
}
export function playUrl(g) {
  if (g.kind === 'embed') return g.entry;
  const base = g.kind === 'builtin' ? 'builtin' : 'g';
  return `${config.gamesOrigin}/${base}/${g.slug}/${g.entry.split('/').map(encodeURIComponent).join('/')}`;
}
function publicGame(g) {
  return {
    slug: g.slug, title: g.title, description: g.description, instructions: g.instructions,
    category: g.category, tags: g.tags ? g.tags.split(',').filter(Boolean) : [], kind: g.kind,
    playUrl: playUrl(g), playOrigin: g.kind === 'embed' ? new URL(g.entry).origin : config.gamesOrigin,
    sourceUrl: g.source_url, cover: g.cover ? `/covers/${g.cover}` : null, coverSeed: g.cover_seed, accent: g.accent,
    author: g.author_id ? publicUser({ username: g.a_username, display_name: g.a_display, avatar: g.a_avatar, level: g.a_level, xp: g.a_xp }) : null,
    featured: !!g.featured, status: g.status, aspect: g.aspect, plays: g.plays, likes: g.likes, sizeBytes: g.size_bytes, createdAt: g.created_at,
  };
}
const GAME_SELECT = `SELECT g.*, u.username a_username, u.display_name a_display, u.avatar a_avatar, u.level a_level, u.xp a_xp
  FROM games g LEFT JOIN users u ON u.id = g.author_id`;
const listGames = (where, order, limit, ...p) => all(`${GAME_SELECT} WHERE g.status='live' ${where ? 'AND ' + where : ''} ORDER BY ${order} LIMIT ${limit}`, ...p).map(publicGame);

function meResponse(u, events = []) {
  return { user: { ...publicUser(u), bio: u.bio, streak: u.streak, progress: progress(u.xp) }, events: forUser(events, u.id) };
}

// ---------- meta ----------
api.get('/meta', (_req, res) => res.json({
  siteName: config.siteName, gamesOrigin: config.gamesOrigin, categories: CATEGORIES, kinds: KINDS,
  rules: RULES, levels: LEVELS, badges: BADGES.map(({ check, ...b }) => b),
  limits: { zipMB: config.limits.zip / 1048576, htmlMB: config.limits.htmlFile / 1048576 },
}));

// ---------- auth ----------
api.get('/me', (req, res) => {
  if (!req.user) return res.json({ user: null, events: [] });
  const events = touchStreak(req.user.id);
  res.json(meResponse(one('SELECT * FROM users WHERE id=?', req.user.id), events));
});

api.post('/auth/signup', (req, res) => {
  if (!rateLimit('auth:' + ip(req), 20, 600e3)) return bad(res, 'Too many attempts. Try again in a few minutes.', 429);
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const displayName = String(req.body.displayName || username).trim().slice(0, 32);
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) return bad(res, 'Usernames are 3–20 letters, numbers or underscores.');
  if (password.length < 8) return bad(res, 'Passwords need at least 8 characters.');
  if (one('SELECT 1 FROM users WHERE username=?', username)) return bad(res, 'That username is taken.');
  const isFirst = !one('SELECT 1 FROM users LIMIT 1');
  const isAdmin = isFirst || config.admins.includes(username.toLowerCase()) ? 1 : 0;
  const avatar = JSON.stringify(req.body.avatar && typeof req.body.avatar === 'object' ? sanitizeAvatar(req.body.avatar) : randomAvatar());
  const { lastInsertRowid: id } = run('INSERT INTO users (username, display_name, pass_hash, avatar, is_admin, created_at) VALUES (?,?,?,?,?,?)',
    username, displayName || username, hashPassword(password), avatar, isAdmin, now());
  createSession(res, Number(id));
  const events = touchStreak(Number(id));
  res.json(meResponse(one('SELECT * FROM users WHERE id=?', id), events));
});

api.post('/auth/login', (req, res) => {
  if (!rateLimit('auth:' + ip(req), 20, 600e3)) return bad(res, 'Too many attempts. Try again in a few minutes.', 429);
  const u = one('SELECT * FROM users WHERE username=?', String(req.body.username || '').trim());
  if (!u || !verifyPassword(String(req.body.password || ''), u.pass_hash)) return bad(res, "That username and password don't match.", 401);
  createSession(res, u.id);
  const events = touchStreak(u.id);
  res.json(meResponse(one('SELECT * FROM users WHERE id=?', u.id), events));
});

api.post('/auth/logout', (req, res) => { destroySession(req, res); res.json({ ok: true }); });

function randomAvatar() {
  const r = n => Math.floor(Math.random() * n);
  return { shape: r(5), color: r(8), eyes: r(5), extra: r(6) };
}
function sanitizeAvatar(a) {
  const c = (v, max) => Math.max(0, Math.min(max - 1, Number(v) | 0));
  return { shape: c(a.shape, 5), color: c(a.color, 8), eyes: c(a.eyes, 5), extra: c(a.extra, 6) };
}

api.patch('/me', requireUser, (req, res) => {
  const u = req.user;
  const displayName = req.body.displayName != null ? String(req.body.displayName).trim().slice(0, 32) || u.display_name : u.display_name;
  const bio = req.body.bio != null ? String(req.body.bio).trim().slice(0, 280) : u.bio;
  const avatar = req.body.avatar ? JSON.stringify(sanitizeAvatar(req.body.avatar)) : u.avatar;
  run('UPDATE users SET display_name=?, bio=?, avatar=? WHERE id=?', displayName, bio, avatar, u.id);
  const events = [];
  if (bio) award(u.id, 'profile', { dedupeKey: `profile:${u.id}` }, events);
  checkBadges(u.id, events);
  res.json(meResponse(one('SELECT * FROM users WHERE id=?', u.id), events));
});

// ---------- games ----------
api.get('/home', (_req, res) => {
  const counts = Object.fromEntries(all("SELECT category, COUNT(*) n FROM games WHERE status='live' GROUP BY category").map(r => [r.category, r.n]));
  res.json({
    featured: listGames('g.featured=1', 'g.updated_at DESC', 5),
    popular: listGames('', 'g.plays DESC, g.likes DESC', 12),
    fresh: listGames('', 'g.created_at DESC', 12),
    community: listGames('g.author_id IS NOT NULL', 'g.created_at DESC', 12),
    loved: listGames('g.likes > 0', 'g.likes DESC', 8),
    categories: counts,
    stats: one("SELECT (SELECT COUNT(*) FROM games WHERE status='live') games, (SELECT COUNT(*) FROM users) players, (SELECT COALESCE(SUM(plays),0) FROM games) plays"),
  });
});

api.get('/games', (req, res) => {
  const where = [], p = [];
  const q = String(req.query.q || '').trim().slice(0, 60);
  if (q) { where.push('(g.title LIKE ? OR g.tags LIKE ? OR g.description LIKE ?)'); p.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (CATEGORIES.includes(req.query.category)) { where.push('g.category=?'); p.push(req.query.category); }
  if (req.query.source === 'community') where.push('g.author_id IS NOT NULL');
  if (req.query.source === 'staff') where.push('g.author_id IS NULL');
  const order = { popular: 'g.plays DESC', loved: 'g.likes DESC', az: 'g.title COLLATE NOCASE ASC' }[req.query.sort] || 'g.created_at DESC';
  const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 36));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const games = listGames(where.join(' AND '), order, `${limit} OFFSET ${offset}`, ...p);
  const total = one(`SELECT COUNT(*) n FROM games g WHERE g.status='live' ${where.length ? 'AND ' + where.join(' AND ') : ''}`, ...p).n;
  res.json({ games, total });
});

const findGame = (slug, viewer) => {
  const g = one(`${GAME_SELECT} WHERE g.slug=?`, slug);
  if (!g) return null;
  if (g.status !== 'live' && !(viewer && (viewer.is_admin || viewer.id === g.author_id))) return null;
  return g;
};
const canEdit = (u, g) => u && (u.is_admin || u.id === g.author_id);
function leaderboard(gameId, limit = 10) {
  return all(`SELECT u.username, u.display_name, u.avatar, u.level, u.xp, MAX(s.score) score, MIN(s.created_at) at
    FROM scores s JOIN users u ON u.id = s.user_id WHERE s.game_id=? GROUP BY s.user_id ORDER BY score DESC, at ASC LIMIT ?`, gameId, limit)
    .map(r => ({ user: publicUser(r), score: r.score }));
}

api.get('/games/:slug', (req, res) => {
  const g = findGame(req.params.slug, req.user);
  if (!g) return bad(res, 'Game not found.', 404);
  const liked = req.user ? !!one('SELECT 1 FROM likes WHERE user_id=? AND game_id=?', req.user.id, g.id) : false;
  const best = req.user ? one('SELECT MAX(score) s FROM scores WHERE user_id=? AND game_id=?', req.user.id, g.id).s : null;
  res.json({
    game: publicGame(g), liked, myBest: best, canEdit: !!canEdit(req.user, g),
    leaderboard: leaderboard(g.id),
    related: listGames('g.category=? AND g.id<>?', 'g.plays DESC', 6, g.category, g.id),
    more: listGames('g.id<>?', 'RANDOM()', 6, g.id),
  });
});

api.post('/games/:slug/play', (req, res) => {
  const g = findGame(req.params.slug, req.user);
  if (!g) return bad(res, 'Game not found.', 404);
  if (!rateLimit(`play:${ip(req)}:${g.id}`, 6, 60e3)) return res.json({ plays: g.plays, events: [] });
  const events = [], d = today(), uid = req.user?.id || null;
  tx(() => {
    run('INSERT INTO plays (game_id, user_id, day, created_at) VALUES (?,?,?,?)', g.id, uid, d, now());
    run('UPDATE games SET plays = plays + 1 WHERE id=?', g.id);
    if (uid) {
      const todays = one("SELECT COUNT(*) n FROM xp_events WHERE user_id=? AND kind='play' AND created_at > ?", uid, Date.parse(d)).n;
      if (todays < 15) award(uid, 'play', { dedupeKey: `play:${uid}:${g.id}:${d}`, label: `Played ${g.title}` }, events);
      if (g.author_id && g.author_id !== uid) {
        award(g.author_id, 'playReceived', { dedupeKey: `pr:${g.id}:${uid}:${d}`, label: `${req.user.display_name} played ${g.title}` }, events);
        checkBadges(g.author_id, events);
      }
      checkBadges(uid, events);
    }
  });
  res.json({ plays: g.plays + 1, events: forUser(events, uid) });
});

api.post('/games/:slug/like', requireUser, (req, res) => {
  const g = findGame(req.params.slug, req.user);
  if (!g) return bad(res, 'Game not found.', 404);
  const uid = req.user.id, events = [];
  const liked = tx(() => {
    if (one('SELECT 1 FROM likes WHERE user_id=? AND game_id=?', uid, g.id)) {
      run('DELETE FROM likes WHERE user_id=? AND game_id=?', uid, g.id);
      run('UPDATE games SET likes = MAX(0, likes - 1) WHERE id=?', g.id);
      return false;
    }
    run('INSERT INTO likes (user_id, game_id, created_at) VALUES (?,?,?)', uid, g.id, now());
    run('UPDATE games SET likes = likes + 1 WHERE id=?', g.id);
    award(uid, 'like', { dedupeKey: `like:${uid}:${g.id}`, label: `Liked ${g.title}` }, events);
    if (g.author_id && g.author_id !== uid) {
      award(g.author_id, 'likeReceived', { dedupeKey: `lr:${g.id}:${uid}`, label: `${req.user.display_name} liked ${g.title}` }, events);
      checkBadges(g.author_id, events);
    }
    checkBadges(uid, events);
    return true;
  });
  res.json({ liked, likes: one('SELECT likes FROM games WHERE id=?', g.id).likes, events: forUser(events, uid) });
});

// Scores come from the game via postMessage → the site page → here. They are
// client-reported, so treat leaderboards as "for fun" until games are verified.
api.post('/games/:slug/score', requireUser, (req, res) => {
  const g = findGame(req.params.slug, req.user);
  if (!g) return bad(res, 'Game not found.', 404);
  const score = Math.floor(Number(req.body.score));
  if (!Number.isFinite(score) || score < 0 || score > 1e9) return bad(res, 'Invalid score.');
  const uid = req.user.id;
  if (!rateLimit(`score:${uid}:${g.id}`, 20, 60e3)) return bad(res, 'Slow down a little.', 429);
  const events = [], d = today();
  const result = tx(() => {
    const prevBest = one('SELECT MAX(score) s FROM scores WHERE user_id=? AND game_id=?', uid, g.id).s;
    const top = one('SELECT MAX(score) s FROM scores WHERE game_id=?', g.id).s;
    run('INSERT INTO scores (game_id, user_id, score, created_at) VALUES (?,?,?,?)', g.id, uid, score, now());
    if (score > 0) award(uid, 'score', { dedupeKey: `score:${uid}:${g.id}:${d}`, label: `Scored ${score.toLocaleString()} in ${g.title}` }, events);
    const pb = prevBest != null && score > prevBest;
    if (pb) award(uid, 'personalBest', { dedupeKey: `pb:${uid}:${g.id}:${d}`, label: `New best in ${g.title}` }, events);
    const isTop = score > 0 && (top == null || score > top);
    if (isTop) award(uid, 'topScore', { dedupeKey: `top:${uid}:${g.id}:${d}`, label: `#1 in ${g.title}` }, events);
    checkBadges(uid, events);
    return { personalBest: pb || prevBest == null, top: isTop, best: Math.max(score, prevBest ?? 0) };
  });
  res.json({ ...result, leaderboard: leaderboard(g.id), events: forUser(events, uid) });
});

// ---------- upload ----------
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.limits.zip, files: 2, fields: 20 } });
const IMG_TYPES = [[[0x89, 0x50, 0x4e, 0x47], 'png'], [[0xff, 0xd8, 0xff], 'jpg'], [[0x47, 0x49, 0x46], 'gif'], [[0x52, 0x49, 0x46, 0x46], 'webp']];
const sniffImage = buf => IMG_TYPES.find(([sig]) => sig.every((b, i) => buf[i] === b))?.[1];

function readGameFields(body, partial = false) {
  const out = {};
  if (!partial || body.title != null) {
    out.title = String(body.title || '').trim().slice(0, 60);
    if (out.title.length < 2) throw new UploadError('Give your game a title.');
  }
  if (!partial || body.description != null) out.description = String(body.description || '').trim().slice(0, 1200);
  if (!partial || body.instructions != null) out.instructions = String(body.instructions || '').trim().slice(0, 600);
  if (!partial || body.category != null) {
    out.category = CATEGORIES.includes(body.category) ? body.category : 'arcade';
  }
  if (!partial || body.tags != null) {
    out.tags = String(body.tags || '').split(',').map(t => t.trim().toLowerCase().replace(/[^a-z0-9 -]/g, '')).filter(Boolean).slice(0, 8).join(',');
  }
  if (!partial || body.aspect != null) out.aspect = ['16:9', '4:3', '1:1', '3:4', '9:16'].includes(body.aspect) ? body.aspect : '16:9';
  return out;
}

function saveCover(file, slug) {
  if (!file) return null;
  if (file.size > config.limits.cover) throw new UploadError('Cover images must be under 3 MB.');
  const ext = sniffImage(file.buffer);
  if (!ext) throw new UploadError('Covers must be PNG, JPG, GIF or WebP.');
  const name = `${slug}-${Date.now().toString(36)}.${ext}`;
  fs.writeFileSync(path.join(coversDir, name), file.buffer);
  return name;
}

api.post('/upload', requireUser, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), wrap(async (req, res) => {
  if (!rateLimit('upload:' + req.user.id, 10, 3600e3)) return bad(res, 'Upload limit reached — try again in an hour.', 429);
  const fields = readGameFields(req.body);
  const kind = String(req.body.kind || '');
  const file = req.files?.file?.[0];
  if (kind === 'html' && file && file.size > config.limits.htmlFile) throw new UploadError('Single-file games must be under 15 MB.');
  const slug = uniqueSlug(fields.title);
  const result = await processUpload({ kind, slug, file, repoUrl: req.body.repoUrl, branch: req.body.branch, subdir: req.body.subdir, embedUrl: req.body.embedUrl });
  let cover = null;
  try { cover = saveCover(req.files?.cover?.[0], slug); } catch (e) { removeGameFiles(slug); throw e; }
  const t = now(), events = [];
  const gameId = tx(() => {
    const { lastInsertRowid } = run(`INSERT INTO games (slug, title, description, instructions, category, tags, kind, entry, source_url, cover, cover_seed, accent, author_id, aspect, size_bytes, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      slug, fields.title, fields.description, fields.instructions, fields.category, fields.tags, result.kind, result.entry, result.sourceUrl,
      cover, Math.floor(Math.random() * 1e6), null, req.user.id, fields.aspect, result.sizeBytes, t, t);
    award(req.user.id, 'upload', { dedupeKey: `upload:${lastInsertRowid}`, label: `Published ${fields.title}` }, events);
    checkBadges(req.user.id, events);
    return lastInsertRowid;
  });
  const g = one(`${GAME_SELECT} WHERE g.id=?`, gameId);
  res.json({ game: publicGame(g), events: forUser(events, req.user.id) });
}));

api.patch('/games/:slug', requireUser, upload.single('cover'), (req, res) => {
  const g = findGame(req.params.slug, req.user);
  if (!g || !canEdit(req.user, g)) return bad(res, 'Game not found.', 404);
  const f = readGameFields(req.body, true);
  if (req.body.status && ['live', 'hidden'].includes(req.body.status)) f.status = req.body.status;
  if (req.user.is_admin && req.body.featured != null) f.featured = String(req.body.featured) === '1' || req.body.featured === true ? 1 : 0;
  if (req.file) f.cover = saveCover(req.file, g.slug);
  if (req.body.removeCover === '1') f.cover = null;
  const keys = Object.keys(f);
  if (keys.length) run(`UPDATE games SET ${keys.map(k => `${k}=?`).join(', ')}, updated_at=? WHERE id=?`, ...keys.map(k => f[k]), now(), g.id);
  res.json({ game: publicGame(one(`${GAME_SELECT} WHERE g.id=?`, g.id)) });
});

api.delete('/games/:slug', requireUser, (req, res) => {
  const g = findGame(req.params.slug, req.user);
  if (!g || !canEdit(req.user, g) || g.kind === 'builtin') return bad(res, 'Game not found.', 404);
  run('DELETE FROM games WHERE id=?', g.id);
  removeGameFiles(g.slug);
  res.json({ ok: true });
});

// ---------- people ----------
api.get('/users/:username', (req, res) => {
  const u = one('SELECT * FROM users WHERE username=?', req.params.username);
  if (!u) return bad(res, 'Player not found.', 404);
  const earned = Object.fromEntries(all('SELECT badge_id, earned_at FROM badges WHERE user_id=?', u.id).map(b => [b.badge_id, b.earned_at]));
  const isMe = req.user?.id === u.id;
  res.json({
    user: { ...publicUser(u), bio: u.bio, streak: u.streak, joined: u.created_at, progress: progress(u.xp) },
    isMe,
    badges: BADGES.map(({ check, ...b }) => ({ ...b, earnedAt: earned[b.id] || null })),
    games: all(`${GAME_SELECT} WHERE g.author_id=? ${isMe || req.user?.is_admin ? '' : "AND g.status='live'"} ORDER BY g.created_at DESC`, u.id).map(publicGame),
    stats: one(`SELECT (SELECT COUNT(DISTINCT game_id) FROM plays WHERE user_id=?) gamesPlayed,
      (SELECT COALESCE(SUM(plays),0) FROM games WHERE author_id=?) playsReceived,
      (SELECT COALESCE(SUM(likes),0) FROM games WHERE author_id=?) likesReceived,
      (SELECT COUNT(*) FROM scores WHERE user_id=?) scores`, u.id, u.id, u.id, u.id),
    activity: all('SELECT kind, amount, label, created_at FROM xp_events WHERE user_id=? ORDER BY created_at DESC LIMIT 20', u.id),
  });
});

api.get('/leaderboard', (_req, res) => {
  const week = now() - 7 * 864e5;
  res.json({
    allTime: all('SELECT * FROM users ORDER BY xp DESC, created_at ASC LIMIT 25').map(u => ({ user: publicUser(u), value: u.xp })),
    weekly: all(`SELECT u.*, SUM(e.amount) wk FROM xp_events e JOIN users u ON u.id=e.user_id WHERE e.created_at > ? GROUP BY u.id ORDER BY wk DESC LIMIT 25`, week)
      .map(u => ({ user: publicUser(u), value: u.wk })),
    creators: all(`SELECT u.*, SUM(g.plays) p, COUNT(g.id) n FROM games g JOIN users u ON u.id=g.author_id WHERE g.status='live' GROUP BY u.id ORDER BY p DESC LIMIT 25`)
      .map(u => ({ user: publicUser(u), value: u.p, games: u.n })),
  });
});

// ---------- errors ----------
api.use((err, _req, res, _next) => {
  if (err instanceof UploadError) return bad(res, err.message);
  if (err instanceof multer.MulterError) return bad(res, err.code === 'LIMIT_FILE_SIZE' ? `That file is too big (max ${config.limits.zip / 1048576} MB).` : err.message);
  console.error(err);
  bad(res, 'Something went wrong on our side.', 500);
});
