// The points system. XP only — no real rewards yet, but everything is logged in
// xp_events so rewards can be layered on later without re-counting anything.
import { db, one, all, run, now, today } from './db.js';

export const RULES = {
  upload:        { xp: 250, label: 'Put a game up' },
  play:          { xp: 10,  label: 'Played a game',            note: 'once per game per day, up to 15 games a day' },
  playReceived:  { xp: 4,   label: 'Someone played your game',  note: 'once per player per game per day' },
  like:          { xp: 2,   label: 'Liked a game',              note: 'once per game' },
  likeReceived:  { xp: 20,  label: 'Someone liked your game',   note: 'once per player per game' },
  score:         { xp: 5,   label: 'Posted a score',            note: 'once per game per day' },
  personalBest:  { xp: 15,  label: 'Beat your own best',        note: 'once per game per day' },
  topScore:      { xp: 50,  label: 'Took the #1 spot',          note: 'once per game per day' },
  streak:        { xp: 15,  label: 'Came back the next day',    note: 'starts at +15, goes up 10 a day, maxes at +75' },
  profile:       { xp: 50,  label: 'Wrote your bio',            note: 'once' },
};

// Total XP needed to *reach* a level. L2 = 100, L3 = 300, L5 = 1,000, L10 = 4,500, L20 = 19,000
export const xpToReach = (level) => 50 * level * (level - 1);
export function levelFor(xp) {
  let l = 1;
  while (xpToReach(l + 1) <= xp) l++;
  return l;
}

const TITLES = [
  [1, 'Button Masher'], [3, 'Coin Slotter'], [5, 'Arcade Regular'], [8, 'Combo Chaser'],
  [12, 'High Scorer'], [16, 'Joystick Jockey'], [21, 'Cabinet Legend'], [30, 'Hall of Famer'],
];
export const titleFor = (level) => TITLES.filter(([l]) => level >= l).pop()[1];

export function progress(xp) {
  const level = levelFor(xp);
  const base = xpToReach(level), next = xpToReach(level + 1);
  return { level, title: titleFor(level), xp, levelStart: base, nextLevel: next, pct: Math.round(((xp - base) / (next - base)) * 100) };
}

export const LEVELS = Array.from({ length: 12 }, (_, i) => {
  const level = [1, 2, 3, 5, 8, 10, 12, 16, 21, 25, 30, 40][i];
  return { level, xp: xpToReach(level), title: titleFor(level) };
});

// Badges are checked after every award. `check` gets the user id and returns true when earned.
const count = (sql, ...p) => one(sql, ...p).n;
export const BADGES = [
  { id: 'first-bite',   name: 'First Bite',     desc: 'Play your first game',                icon: 'joystick', check: u => count('SELECT COUNT(*) n FROM plays WHERE user_id=?', u) >= 1 },
  { id: 'taste-tester', name: 'Taste Tester',   desc: 'Play 10 different games',             icon: 'plate',    check: u => count('SELECT COUNT(DISTINCT game_id) n FROM plays WHERE user_id=?', u) >= 10 },
  { id: 'maker',        name: 'Maker',          desc: 'Publish your first game',             icon: 'wrench',   check: u => count("SELECT COUNT(*) n FROM games WHERE author_id=? AND status='live'", u) >= 1 },
  { id: 'studio',       name: 'One-Person Studio', desc: 'Publish 5 games',                  icon: 'stack',    check: u => count("SELECT COUNT(*) n FROM games WHERE author_id=? AND status='live'", u) >= 5 },
  { id: 'crowd',        name: 'Crowd Pleaser',  desc: 'Get 100 plays on your games',            icon: 'crowd',    check: u => count('SELECT COALESCE(SUM(plays),0) n FROM games WHERE author_id=?', u) >= 100 },
  { id: 'hearts',       name: 'Heartbreaker',   desc: 'Get 25 likes on your games',         icon: 'heart',    check: u => count('SELECT COALESCE(SUM(likes),0) n FROM games WHERE author_id=?', u) >= 25 },
  { id: 'scorer',       name: 'On the Board',   desc: 'Get on any leaderboard',     icon: 'flag',     check: u => count('SELECT COUNT(*) n FROM scores WHERE user_id=?', u) >= 1 },
  { id: 'champ',        name: 'Champ',          desc: 'Be #1 on any game',                 icon: 'crown',    check: u => count(`SELECT COUNT(*) n FROM (SELECT game_id, user_id FROM scores s WHERE score = (SELECT MAX(score) FROM scores WHERE game_id=s.game_id)) WHERE user_id=?`, u) >= 1 },
  { id: 'streak-7',     name: 'Week Streak',    desc: 'Come back 7 days in a row',             icon: 'flame',    check: u => one('SELECT streak FROM users WHERE id=?', u).streak >= 7 },
  { id: 'level-5',      name: 'Regular',        desc: 'Reach level 5',                       icon: 'star',     check: u => one('SELECT level FROM users WHERE id=?', u).level >= 5 },
  { id: 'level-10',     name: 'Veteran',        desc: 'Reach level 10',                      icon: 'bolt',     check: u => one('SELECT level FROM users WHERE id=?', u).level >= 10 },
  { id: 'founder',      name: 'Early Snacker',  desc: 'Got here early (first 100 players)',        icon: 'cake',     check: u => u <= 100 },
];

// Award XP. Returns null if this exact award was already given (dedupeKey) or the amount is 0.
// `out` collects what happened so the API can show toasts (XP gained, level ups, badges).
export function award(userId, kind, { amount, dedupeKey = null, label } = {}, out = []) {
  const rule = RULES[kind];
  const xp = amount ?? rule.xp;
  if (!userId || !xp) return null;
  const res = run('INSERT OR IGNORE INTO xp_events (user_id, kind, amount, dedupe_key, label, created_at) VALUES (?,?,?,?,?,?)',
    userId, kind, xp, dedupeKey, label || rule.label, now());
  if (!res.changes) return null;
  const before = one('SELECT xp, level FROM users WHERE id=?', userId);
  const total = before.xp + xp;
  const level = levelFor(total);
  run('UPDATE users SET xp=?, level=? WHERE id=?', total, level, userId);
  out.push({ type: 'xp', userId, amount: xp, label: label || rule.label });
  if (level > before.level) out.push({ type: 'level', userId, level, title: titleFor(level) });
  return xp;
}

export function checkBadges(userId, out = []) {
  if (!userId) return out;
  const have = new Set(all('SELECT badge_id FROM badges WHERE user_id=?', userId).map(b => b.badge_id));
  for (const b of BADGES) {
    if (have.has(b.id)) continue;
    if (b.check(userId)) {
      run('INSERT OR IGNORE INTO badges (user_id, badge_id, earned_at) VALUES (?,?,?)', userId, b.id, now());
      out.push({ type: 'badge', userId, badge: { id: b.id, name: b.name, desc: b.desc, icon: b.icon } });
    }
  }
  return out;
}

// Daily streak, called on any authenticated request that counts as "showing up".
export function touchStreak(userId, out = []) {
  const u = one('SELECT streak, last_active_day FROM users WHERE id=?', userId);
  const d = today();
  if (u.last_active_day === d) return out;
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const streak = u.last_active_day === yesterday ? u.streak + 1 : 1;
  run('UPDATE users SET streak=?, last_active_day=? WHERE id=?', streak, d, userId);
  award(userId, 'streak', { amount: 15 + 10 * Math.min(streak - 1, 6), dedupeKey: `streak:${userId}:${d}`, label: `Day ${streak} streak` }, out);
  checkBadges(userId, out);
  return out;
}

// Only return events meant for the person making the request (creator awards stay silent for them).
export const forUser = (events, userId) => events.filter(e => e.userId === userId).map(({ userId: _, ...e }) => e);

export { db };
