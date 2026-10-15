// Ratings ("Snack Score"), comments, and the automatic monthly Game of the Month.
import { one, all, run, tx, now } from './db.js';
import { award, checkBadges } from './xp.js';

export const RATING_LABELS = ['', 'Stale', 'Meh', 'Tasty', 'Delicious', "Chef's kiss"];
export const COMMENT_MAX = 500;
// How a month is decided: a Bayesian average of the ratings given that month, so a game
// with one 5-bite vote can't beat one with forty 4.6s. Needs at least MIN_VOTES to place.
export const MONTH_RULES = { minVotes: 3, prior: 5, places: 3, prizes: [500, 250, 100] };

// ---------- ratings ----------
export function ratingSummary(gameId, userId) {
  const rows = all('SELECT stars, COUNT(*) n FROM ratings WHERE game_id=? GROUP BY stars', gameId);
  const dist = [0, 0, 0, 0, 0];
  let sum = 0, count = 0;
  for (const r of rows) { dist[r.stars - 1] = r.n; sum += r.stars * r.n; count += r.n; }
  const mine = userId ? one('SELECT stars FROM ratings WHERE user_id=? AND game_id=?', userId, gameId)?.stars ?? null : null;
  return { avg: count ? Math.round((sum / count) * 10) / 10 : null, count, dist, mine };
}

// Why someone can't rate (null = they can).
export function rateBlocker(user, game) {
  if (!user) return 'signin';
  if (game.author_id === user.id) return 'own';
  if (!one('SELECT 1 FROM plays WHERE user_id=? AND game_id=? LIMIT 1', user.id, game.id)) return 'play';
  return null;
}

export function rate(user, game, stars, events) {
  return tx(() => {
    const prev = one('SELECT stars FROM ratings WHERE user_id=? AND game_id=?', user.id, game.id);
    const t = now();
    if (prev) {
      run('UPDATE ratings SET stars=?, updated_at=? WHERE user_id=? AND game_id=?', stars, t, user.id, game.id);
      run('UPDATE games SET rating_sum = rating_sum + ? WHERE id=?', stars - prev.stars, game.id);
    } else {
      run('INSERT INTO ratings (user_id, game_id, stars, created_at, updated_at) VALUES (?,?,?,?,?)', user.id, game.id, stars, t, t);
      run('UPDATE games SET rating_sum = rating_sum + ?, rating_count = rating_count + 1 WHERE id=?', stars, game.id);
      award(user.id, 'rate', { dedupeKey: `rate:${user.id}:${game.id}`, label: `Rated ${game.title}` }, events);
      checkBadges(user.id, events);
    }
    return ratingSummary(game.id, user.id);
  });
}

// ---------- comments ----------
const COMMENT_SELECT = `SELECT c.id, c.body, c.created_at, c.user_id, u.username, u.display_name, u.avatar, u.level, u.xp,
  (SELECT stars FROM ratings r WHERE r.user_id=c.user_id AND r.game_id=c.game_id) stars
  FROM comments c JOIN users u ON u.id=c.user_id`;

export function listComments(gameId, { limit = 20, offset = 0 } = {}) {
  const items = all(`${COMMENT_SELECT} WHERE c.game_id=? ORDER BY c.created_at DESC, c.id DESC LIMIT ? OFFSET ?`, gameId, limit, offset);
  const total = one('SELECT COUNT(*) n FROM comments WHERE game_id=?', gameId).n;
  return { items, total };
}

// Tidy user text: normalise newlines, drop control characters, collapse runs of blank lines.
export function cleanBody(s) {
  return String(s ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '')
    .replace(/\n{3,}/g, '\n\n').trim();
}

export function addComment(user, game, body, events) {
  return tx(() => {
    const t = now();
    const id = Number(run('INSERT INTO comments (game_id, user_id, body, created_at) VALUES (?,?,?,?)', game.id, user.id, body, t).lastInsertRowid);
    run('UPDATE games SET comment_count = comment_count + 1 WHERE id=?', game.id);
    if (game.author_id !== user.id) award(user.id, 'comment', { dedupeKey: `comment:${user.id}:${game.id}`, label: `Commented on ${game.title}` }, events);
    checkBadges(user.id, events);
    return one(`${COMMENT_SELECT} WHERE c.id=?`, id);
  });
}

export function deleteComment(id) {
  return tx(() => {
    const c = one('SELECT game_id FROM comments WHERE id=?', id);
    if (!c) return false;
    run('DELETE FROM comments WHERE id=?', id);
    run('UPDATE games SET comment_count = MAX(0, comment_count - 1) WHERE id=?', c.game_id);
    return true;
  });
}

// ---------- monthly ----------
export const monthOf = (ts) => new Date(ts).toISOString().slice(0, 7);
export function monthRange(month) {
  const [y, m] = month.split('-').map(Number);
  return [Date.UTC(y, m - 1, 1), Date.UTC(y, m, 1)];
}
const prevMonth = (month) => { const [y, m] = month.split('-').map(Number); return monthOf(Date.UTC(y, m - 2, 1)); };

// Live standings for a month: ratings given (or changed) during that month, live games only.
export function standings(month, limit = 10) {
  const [from, to] = monthRange(month);
  const rows = all(`SELECT g.id, g.slug, g.title, g.author_id, g.category, g.cover, g.cover_seed, g.accent,
      u.username a_username, u.display_name a_display, COUNT(*) votes, AVG(r.stars) avg
    FROM ratings r JOIN games g ON g.id=r.game_id LEFT JOIN users u ON u.id=g.author_id
    WHERE r.updated_at >= ? AND r.updated_at < ? AND g.status='live'
    GROUP BY g.id`, from, to);
  const all_ = rows.reduce((a, r) => a + r.avg * r.votes, 0), n = rows.reduce((a, r) => a + r.votes, 0);
  const mean = n ? all_ / n : 3;
  const { prior, minVotes } = MONTH_RULES;
  return rows
    .map(r => ({ ...r, avg: Math.round(r.avg * 100) / 100, score: Math.round(((prior * mean + r.avg * r.votes) / (prior + r.votes)) * 1000) / 1000, eligible: r.votes >= minVotes }))
    .sort((a, b) => (b.eligible - a.eligible) || (b.score - a.score) || (b.votes - a.votes) || a.title.localeCompare(b.title))
    .slice(0, limit);
}

// Lock in every finished month that hasn't been decided yet. Safe to call any time; runs on
// start-up and then hourly, so the winners appear within an hour of a month ending (UTC).
export function finalizeMonths(log = () => {}) {
  const first = one('SELECT MIN(updated_at) t FROM ratings').t;
  if (!first) return 0;
  const current = monthOf(now());
  let month = prevMonth(current), done = 0;
  const firstMonth = monthOf(first);
  while (month >= firstMonth) {
    if (one('SELECT 1 FROM monthly_results WHERE month=?', month)) break;   // everything before is already decided
    const winners = standings(month, MONTH_RULES.places).filter(r => r.eligible);
    tx(() => {
      run('INSERT INTO monthly_results (month, finalized_at) VALUES (?,?)', month, now());
      winners.forEach((w, i) => {
        run(`INSERT INTO monthly_awards (month, place, game_id, title, slug, author_id, score, avg, votes) VALUES (?,?,?,?,?,?,?,?,?)`,
          month, i + 1, w.id, w.title, w.slug, w.author_id, w.score, w.avg, w.votes);
        if (w.author_id) {
          award(w.author_id, 'gotm', { amount: MONTH_RULES.prizes[i], dedupeKey: `gotm:${month}:${i + 1}`,
            label: i === 0 ? `${w.title} won Game of the Month` : `${w.title} placed #${i + 1} for the month` });
          checkBadges(w.author_id);
        }
      });
    });
    log(`🏆 ${month} decided: ${winners.map(w => w.title).join(', ') || 'not enough votes'}`);
    done++;
    month = prevMonth(month);
  }
  return done;
}

export function pastWinners(limit = 24) {
  const rows = all(`SELECT a.*, g.cover, g.cover_seed, g.accent, g.category, g.status, u.username a_username, u.display_name a_display
    FROM monthly_awards a LEFT JOIN games g ON g.id=a.game_id LEFT JOIN users u ON u.id=a.author_id
    ORDER BY a.month DESC, a.place ASC`);
  const months = [];
  for (const r of rows) {
    let m = months.find(x => x.month === r.month);
    if (!m) { if (months.length >= limit) break; m = { month: r.month, winners: [] }; months.push(m); }
    m.winners.push(r);
  }
  return months;
}
