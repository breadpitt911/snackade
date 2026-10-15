// Admin dashboard API: site stats, game management, user management, and a log of admin actions.
// Mounted at /api/admin. Every route needs a signed-in admin.
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { coversDir } from './config.js';
import { one, all, run, tx, now } from './db.js';
import { removeGameFiles } from './uploads.js';
import { deleteAccount, openReportCount } from './moderation.js';
import { checkGame, googleEnabled } from './scan.js';
import { clearSitemapCache } from './seo.js';

export const admin = express.Router();
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });
admin.use((req, res, next) => req.user?.is_admin ? next() : bad(res, 'Not found.', 404));

const log = (req, action, target) => run('INSERT INTO admin_log (admin_id, action, target, created_at) VALUES (?,?,?,?)', req.user.id, action, String(target).slice(0, 200), now());
const DAY = 864e5;
const dayKey = t => new Date(t).toISOString().slice(0, 10);

admin.get('/overview', (_req, res) => {
  const t = now(), wk = t - 7 * DAY, today = dayKey(t);
  const since = dayKey(t - 13 * DAY);
  const series = (rows) => { const m = Object.fromEntries(rows.map(r => [r.d, r.n])); return Array.from({ length: 14 }, (_, i) => { const d = dayKey(t - (13 - i) * DAY); return { d, n: m[d] || 0 }; }); };
  res.json({
    stats: one(`SELECT
      (SELECT COUNT(*) FROM users) players, (SELECT COUNT(*) FROM users WHERE created_at > ?) newPlayers,
      (SELECT COUNT(*) FROM games WHERE status='live') liveGames, (SELECT COUNT(*) FROM games WHERE author_id IS NOT NULL AND created_at > ?) newGames,
      (SELECT COUNT(*) FROM plays WHERE day = ?) playsToday, (SELECT COUNT(*) FROM plays WHERE created_at > ?) playsWeek,
      (SELECT COUNT(*) FROM comments WHERE created_at > ?) commentsWeek, (SELECT COUNT(*) FROM ratings WHERE updated_at > ?) ratingsWeek,
      (SELECT COUNT(*) FROM games WHERE taken_down=1) takenDown, (SELECT COUNT(*) FROM users WHERE banned=1) banned`,
      wk, wk, today, wk, wk, wk),
    openReports: openReportCount(),
    scanner: { local: true, google: googleEnabled() },
    charts: {
      plays: series(all('SELECT day d, COUNT(*) n FROM plays WHERE day >= ? GROUP BY day', since)),
      signups: series(all("SELECT strftime('%Y-%m-%d', created_at/1000, 'unixepoch') d, COUNT(*) n FROM users WHERE created_at >= ? GROUP BY d", Date.parse(since))),
      uploads: series(all("SELECT strftime('%Y-%m-%d', created_at/1000, 'unixepoch') d, COUNT(*) n FROM games WHERE author_id IS NOT NULL AND created_at >= ? GROUP BY d", Date.parse(since))),
    },
    log: all(`SELECT l.action, l.target, l.created_at, u.username FROM admin_log l LEFT JOIN users u ON u.id=l.admin_id ORDER BY l.id DESC LIMIT 15`),
  });
});

// ---------- games ----------
admin.get('/games', (req, res) => {
  const where = [], p = [];
  const q = String(req.query.q || '').trim().slice(0, 60);
  if (q) { where.push('(g.title LIKE ? OR g.slug LIKE ? OR u.username LIKE ?)'); p.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const f = { live: "g.status='live'", hidden: "g.status='hidden' AND g.taken_down=0", down: 'g.taken_down=1', featured: 'g.featured=1', community: 'g.author_id IS NOT NULL' }[req.query.filter];
  if (f) where.push(f);
  const offset = Math.max(0, Math.floor(Number(req.query.offset)) || 0);
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const games = all(`SELECT g.id, g.slug, g.title, g.kind, g.status, g.taken_down, g.featured, g.plays, g.likes, g.rating_sum, g.rating_count, g.comment_count, g.size_bytes, g.created_at, g.ext_hosts,
      u.username author, (SELECT COUNT(*) FROM reports r WHERE r.game_id=g.id AND r.status='open') reports
    FROM games g LEFT JOIN users u ON u.id=g.author_id ${w} ORDER BY g.created_at DESC LIMIT 50 OFFSET ?`, ...p, offset);
  const total = one(`SELECT COUNT(*) n FROM games g LEFT JOIN users u ON u.id=g.author_id ${w}`, ...p).n;
  res.json({ total, games: games.map(g => ({ slug: g.slug, title: g.title, kind: g.kind, status: g.status, takenDown: !!g.taken_down, featured: !!g.featured,
    plays: g.plays, likes: g.likes, rating: g.rating_count ? Math.round(g.rating_sum / g.rating_count * 10) / 10 : null, ratings: g.rating_count, comments: g.comment_count,
    sizeBytes: g.size_bytes, createdAt: g.created_at, author: g.author, reports: g.reports, hosts: g.ext_hosts ? g.ext_hosts.split(',') : [] })) });
});

admin.post('/games/:slug', express.json(), async (req, res) => {
  const g = one('SELECT * FROM games WHERE slug=?', req.params.slug);
  if (!g) return bad(res, "Can't find that game.", 404);
  const action = String(req.body.action || ''), t = now();
  const set = (sql, ...p) => run(`UPDATE games SET ${sql}, updated_at=? WHERE id=?`, ...p, t, g.id);
  switch (action) {
    case 'feature': set('featured=1'); break;
    case 'unfeature': set('featured=0'); break;
    case 'hide': set("status='hidden'"); break;
    case 'show': set("status='live', taken_down=0"); break;
    case 'takedown': set("status='hidden', taken_down=1, featured=0"); break;
    case 'restore': set("status='live', taken_down=0"); break;
    case 'rescan': {
      if (g.kind === 'builtin') return bad(res, 'Built-in games are not scanned.');
      const r = await checkGame(g.id);
      log(req, action, g.slug);
      return res.json({ ok: true, scan: r });
    }
    case 'delete':
      if (g.kind === 'builtin') return bad(res, "Built-in games can't be deleted, only hidden.");
      run('DELETE FROM games WHERE id=?', g.id);
      removeGameFiles(g.slug);
      if (g.cover && /^[a-z0-9-]+\.(png|jpg|gif|webp)$/.test(g.cover)) fs.rmSync(path.join(coversDir, g.cover), { force: true });
      break;
    default: return bad(res, 'Unknown action.');
  }
  log(req, action, g.slug);
  clearSitemapCache();
  res.json({ ok: true });
});

// ---------- users ----------
admin.get('/users', (req, res) => {
  const where = [], p = [];
  const q = String(req.query.q || '').trim().slice(0, 40);
  if (q) { where.push('(u.username LIKE ? OR u.display_name LIKE ?)'); p.push(`%${q}%`, `%${q}%`); }
  const f = { admins: 'u.is_admin=1', banned: 'u.banned=1', makers: 'EXISTS (SELECT 1 FROM games g WHERE g.author_id=u.id)' }[req.query.filter];
  if (f) where.push(f);
  const offset = Math.max(0, Math.floor(Number(req.query.offset)) || 0);
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const sort = { xp: 'u.xp DESC', new: 'u.created_at DESC' }[req.query.sort] || 'u.created_at DESC';
  const users = all(`SELECT u.id, u.username, u.display_name, u.avatar, u.level, u.xp, u.is_admin, u.banned, u.created_at, u.last_active_day,
      (SELECT COUNT(*) FROM games g WHERE g.author_id=u.id) games, (SELECT COUNT(*) FROM comments c WHERE c.user_id=u.id) comments,
      (SELECT COUNT(*) FROM reports r JOIN comments c ON c.id=r.comment_id WHERE c.user_id=u.id) + (SELECT COUNT(*) FROM reports r JOIN games g ON g.id=r.game_id AND r.kind='game' WHERE g.author_id=u.id) reported
    FROM users u ${w} ORDER BY ${sort} LIMIT 50 OFFSET ?`, ...p, offset);
  const total = one(`SELECT COUNT(*) n FROM users u ${w}`, ...p).n;
  res.json({ total, users: users.map(u => ({ username: u.username, displayName: u.display_name, avatar: JSON.parse(u.avatar || '{}'), level: u.level, xp: u.xp,
    isAdmin: !!u.is_admin, banned: !!u.banned, createdAt: u.created_at, lastActive: u.last_active_day, games: u.games, comments: u.comments, reported: u.reported,
    isMe: u.id === req.user.id })) });
});

admin.post('/users/:username', express.json(), (req, res) => {
  const u = one('SELECT * FROM users WHERE username=?', req.params.username);
  if (!u) return bad(res, 'No player with that name.', 404);
  const action = String(req.body.action || '');
  if (u.id === req.user.id) return bad(res, "You can't do that to your own account from here.");
  switch (action) {
    case 'ban':
      tx(() => {
        run('UPDATE users SET banned=1, is_admin=0 WHERE id=?', u.id);
        run('DELETE FROM sessions WHERE user_id=?', u.id);
        if (req.body.hideGames) run("UPDATE games SET status='hidden', taken_down=1, featured=0 WHERE author_id=?", u.id);
      });
      break;
    case 'unban': run('UPDATE users SET banned=0 WHERE id=?', u.id); break;
    case 'admin':
      if (u.banned) return bad(res, 'Unban them first.');
      run('UPDATE users SET is_admin=1 WHERE id=?', u.id); break;
    case 'unadmin': run('UPDATE users SET is_admin=0 WHERE id=?', u.id); break;
    case 'delete': deleteAccount(u.id); break;
    default: return bad(res, 'Unknown action.');
  }
  log(req, action + (action === 'ban' && req.body.hideGames ? ' +games' : ''), '@' + u.username);
  clearSitemapCache();
  res.json({ ok: true });
});
