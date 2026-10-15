// Reports (notice-and-action), takedowns, and the account tools people have a legal right to:
// download your data, delete your account.
import fs from 'node:fs';
import path from 'node:path';
import { coversDir } from './config.js';
import { one, all, run, tx, now } from './db.js';
import { removeGameFiles } from './uploads.js';

export const REPORT_REASONS = {
  game: [
    ['copyright', "Copyright: it's not theirs to share"],
    ['malware', 'Malware, scams or something sketchy'],
    ['inappropriate', 'Illegal or inappropriate content'],
    ['broken', "Broken or won't load"],
    ['other', 'Something else'],
  ],
  comment: [
    ['spam', 'Spam or ads'],
    ['abuse', 'Harassment or hate'],
    ['inappropriate', 'Illegal or inappropriate content'],
    ['other', 'Something else'],
  ],
};
export const DETAILS_MAX = 1500;
const EMAIL = /^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[a-z]{2,}$/i;

export class ReportError extends Error {}

// Validate and store a report. `target` is the game row, plus the comment row for comment reports.
export function createReport({ kind, game, comment, reason, details, contact, reporterId }) {
  if (!REPORT_REASONS[kind]?.some(([k]) => k === reason)) throw new ReportError('Pick a reason.');
  details = String(details ?? '').replace(/\r\n?/g, '\n').trim().slice(0, DETAILS_MAX);
  contact = String(contact ?? '').trim().slice(0, 120);
  if (contact && !EMAIL.test(contact)) throw new ReportError("That email doesn't look right.");
  if (reason === 'copyright') {
    if (!contact) throw new ReportError('Copyright reports need an email so we can follow up.');
    if (details.length < 20) throw new ReportError('Tell us which work is yours and where the original is (a link helps).');
  }
  if (reason === 'other' && details.length < 10) throw new ReportError('Tell us a bit about what is wrong.');
  const snapshot = kind === 'comment' ? `${comment.username}: ${comment.body}`.slice(0, 600) : game.title;
  run(`INSERT INTO reports (kind, game_id, comment_id, snapshot, reason, details, contact, reporter_id, created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    kind, game.id, kind === 'comment' ? comment.id : null, snapshot, reason, details, contact, reporterId || null, now());
}

export const openReportCount = () => one("SELECT COUNT(*) n FROM reports WHERE status='open'").n;

export function listReports(status = 'open', limit = 100) {
  const where = status === 'open' ? "r.status='open'" : "r.status<>'open'";
  return all(`SELECT r.*, g.slug, g.title, g.status game_status, g.taken_down, g.kind game_kind,
      au.username author_username, ru.username reporter_username, mu.username resolver_username,
      (SELECT 1 FROM comments c WHERE c.id=r.comment_id) comment_exists,
      (SELECT COUNT(*) FROM reports r2 WHERE r2.status='open' AND r2.kind=r.kind AND r2.game_id IS r.game_id AND r2.comment_id IS r.comment_id) open_same
    FROM reports r LEFT JOIN games g ON g.id=r.game_id LEFT JOIN users au ON au.id=g.author_id
    LEFT JOIN users ru ON ru.id=r.reporter_id LEFT JOIN users mu ON mu.id=r.resolved_by
    WHERE ${where} ORDER BY r.created_at DESC LIMIT ?`, limit);
}

// Admin decision on a report. Acting on one report closes every open report about the same thing.
export function resolveReport(id, action, admin) {
  const r = one('SELECT * FROM reports WHERE id=?', id);
  if (!r) throw new ReportError('That report is gone.');
  const t = now();
  const close = (status, sameTarget) => sameTarget
    ? run(`UPDATE reports SET status=?, resolved_at=?, resolved_by=? WHERE status='open' AND kind=? AND game_id IS ? AND comment_id IS ?`, status, t, admin.id, r.kind, r.game_id, r.comment_id)
    : run('UPDATE reports SET status=?, resolved_at=?, resolved_by=? WHERE id=?', status, t, admin.id, id);
  tx(() => {
    if (action === 'dismiss') return close('dismissed', false);
    if (action === 'takedown' && r.kind === 'game' && r.game_id) {
      run("UPDATE games SET status='hidden', taken_down=1, featured=0, updated_at=? WHERE id=?", t, r.game_id);
      return close('actioned', true);
    }
    if (action === 'restore' && r.kind === 'game' && r.game_id) {
      run("UPDATE games SET status='live', taken_down=0, updated_at=? WHERE id=?", t, r.game_id);
      return close('dismissed', true);
    }
    if (action === 'delete-comment' && r.kind === 'comment') {
      const c = r.comment_id && one('SELECT game_id FROM comments WHERE id=?', r.comment_id);
      if (c) {
        run('DELETE FROM comments WHERE id=?', r.comment_id);
        run('UPDATE games SET comment_count = MAX(0, comment_count - 1) WHERE id=?', c.game_id);
      }
      return close('actioned', true);
    }
    throw new ReportError("That action doesn't fit this report.");
  });
}

// Closed reports are kept for a year (in case of disputes), then deleted. Runs hourly.
export function purgeOldReports() {
  return run("DELETE FROM reports WHERE status<>'open' AND resolved_at < ?", now() - 365 * 864e5).changes;
}

// ---------- your data ----------
export function exportData(userId) {
  const u = one('SELECT * FROM users WHERE id=?', userId);
  const ts = x => x == null ? null : new Date(x).toISOString();
  return {
    exportedAt: ts(now()),
    account: { username: u.username, displayName: u.display_name, bio: u.bio, avatar: JSON.parse(u.avatar || '{}'), xp: u.xp, level: u.level,
      streak: u.streak, isAdmin: !!u.is_admin, createdAt: ts(u.created_at), agreedToTermsAt: ts(u.agreed_at) },
    games: all('SELECT slug, title, description, instructions, category, tags, kind, source_url, status, plays, likes, created_at, updated_at FROM games WHERE author_id=?', userId)
      .map(g => ({ ...g, created_at: ts(g.created_at), updated_at: ts(g.updated_at) })),
    comments: all('SELECT g.slug game, c.body, c.created_at FROM comments c JOIN games g ON g.id=c.game_id WHERE c.user_id=? ORDER BY c.created_at', userId).map(c => ({ ...c, created_at: ts(c.created_at) })),
    ratings: all('SELECT g.slug game, r.stars, r.updated_at FROM ratings r JOIN games g ON g.id=r.game_id WHERE r.user_id=?', userId).map(r => ({ ...r, updated_at: ts(r.updated_at) })),
    likes: all('SELECT g.slug game, l.created_at FROM likes l JOIN games g ON g.id=l.game_id WHERE l.user_id=?', userId).map(r => ({ ...r, created_at: ts(r.created_at) })),
    scores: all('SELECT g.slug game, s.score, s.created_at FROM scores s JOIN games g ON g.id=s.game_id WHERE s.user_id=? ORDER BY s.created_at', userId).map(r => ({ ...r, created_at: ts(r.created_at) })),
    plays: all('SELECT g.slug game, p.day FROM plays p JOIN games g ON g.id=p.game_id WHERE p.user_id=? ORDER BY p.created_at', userId),
    xp: all('SELECT kind, amount, label, created_at FROM xp_events WHERE user_id=? ORDER BY created_at', userId).map(r => ({ ...r, created_at: ts(r.created_at) })),
    badges: all('SELECT badge_id, earned_at FROM badges WHERE user_id=?', userId).map(r => ({ ...r, earned_at: ts(r.earned_at) })),
    reportsYouSent: all('SELECT kind, reason, details, contact, status, created_at FROM reports WHERE reporter_id=?', userId).map(r => ({ ...r, created_at: ts(r.created_at) })),
  };
}

// Deletes the account and everything that belongs to it: games (and their files), comments,
// ratings, likes, scores, XP, sessions. Anonymous play counts stay. Cached totals on other
// people's games are recounted so scores and comment counts stay right.
export function deleteAccount(userId) {
  const games = all('SELECT id, slug, cover FROM games WHERE author_id=?', userId);
  const touched = all(`SELECT game_id FROM comments WHERE user_id=? UNION SELECT game_id FROM ratings WHERE user_id=?
    UNION SELECT game_id FROM likes WHERE user_id=?`, userId, userId, userId).map(r => r.game_id);
  tx(() => {
    run('DELETE FROM games WHERE author_id=?', userId);
    run('DELETE FROM users WHERE id=?', userId);
    for (const id of touched) {
      run(`UPDATE games SET
        rating_sum = COALESCE((SELECT SUM(stars) FROM ratings WHERE game_id=?), 0),
        rating_count = (SELECT COUNT(*) FROM ratings WHERE game_id=?),
        comment_count = (SELECT COUNT(*) FROM comments WHERE game_id=?),
        likes = (SELECT COUNT(*) FROM likes WHERE game_id=?) WHERE id=?`, id, id, id, id, id);
    }
  });
  for (const g of games) {
    removeGameFiles(g.slug);
    if (g.cover && /^[a-z0-9-]+\.(png|jpg|gif|webp)$/.test(g.cover)) fs.rmSync(path.join(coversDir, g.cover), { force: true });
  }
  return games.length;
}
