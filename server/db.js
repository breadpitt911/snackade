import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config, storageDir, coversDir } from './config.js';

fs.mkdirSync(config.dataDir, { recursive: true });
fs.mkdirSync(storageDir, { recursive: true });
fs.mkdirSync(coversDir, { recursive: true });

export const db = new DatabaseSync(path.join(config.dataDir, 'snackbar.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 4000;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  pass_hash TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '{}',
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  is_admin INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  last_active_day TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  instructions TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'arcade',
  tags TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL,              -- builtin | html | html5 | github | unity | embed
  entry TEXT NOT NULL,             -- path inside the game folder, or full URL for embeds
  source_url TEXT,
  cover TEXT,                      -- file in data/covers, or null for a generated cover
  cover_seed INTEGER NOT NULL DEFAULT 0,
  accent TEXT,
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'live',
  featured INTEGER NOT NULL DEFAULT 0,
  aspect TEXT NOT NULL DEFAULT '16:9',
  plays INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS games_status ON games(status, created_at);
CREATE TABLE IF NOT EXISTS likes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, game_id)
);
CREATE TABLE IF NOT EXISTS plays (
  id INTEGER PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  day TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS plays_game ON plays(game_id, day);
CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS scores_game ON scores(game_id, score DESC);
CREATE TABLE IF NOT EXISTS xp_events (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  amount INTEGER NOT NULL,
  dedupe_key TEXT UNIQUE,
  label TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS xp_user ON xp_events(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS badges (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  earned_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, badge_id)
);
`);

// ---------- community: ratings, comments, monthly awards ----------
db.exec(`
CREATE TABLE IF NOT EXISTS ratings (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, game_id)
);
CREATE INDEX IF NOT EXISTS ratings_game ON ratings(game_id);
CREATE INDEX IF NOT EXISTS ratings_time ON ratings(updated_at);
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS comments_game ON comments(game_id, created_at DESC);
CREATE TABLE IF NOT EXISTS monthly_results (
  month TEXT PRIMARY KEY,          -- YYYY-MM (UTC), written once the month is over
  finalized_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS monthly_awards (
  month TEXT NOT NULL,
  place INTEGER NOT NULL,
  game_id INTEGER REFERENCES games(id) ON DELETE SET NULL,
  title TEXT NOT NULL,             -- kept in case the game is deleted later
  slug TEXT NOT NULL,
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  score REAL NOT NULL,
  avg REAL NOT NULL,
  votes INTEGER NOT NULL,
  PRIMARY KEY (month, place)
);
`);
// Cached rating totals on games, so lists can show a score without a join.
{
  const cols = new Set(db.prepare('PRAGMA table_info(games)').all().map(c => c.name));
  if (!cols.has('rating_sum')) db.exec('ALTER TABLE games ADD COLUMN rating_sum INTEGER NOT NULL DEFAULT 0');
  if (!cols.has('rating_count')) db.exec('ALTER TABLE games ADD COLUMN rating_count INTEGER NOT NULL DEFAULT 0');
  if (!cols.has('comment_count')) db.exec('ALTER TABLE games ADD COLUMN comment_count INTEGER NOT NULL DEFAULT 0');
}

export const one = (sql, ...p) => db.prepare(sql).get(...p);
export const all = (sql, ...p) => db.prepare(sql).all(...p);
export const run = (sql, ...p) => db.prepare(sql).run(...p);

export function tx(fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}

export const today = () => new Date().toISOString().slice(0, 10);
export const now = () => Date.now();
