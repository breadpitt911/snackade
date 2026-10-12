// Registers every folder in /games that has a game.json as a built-in "staff" game.
// Drop a folder in there (index.html + game.json) and restart to add more.
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { one, run, now } from './db.js';

export function seedBuiltinGames() {
  const dir = config.builtinGamesDir;
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  for (const slug of fs.readdirSync(dir)) {
    const manifest = path.join(dir, slug, 'game.json');
    if (!/^[a-z0-9-]+$/.test(slug) || !fs.existsSync(manifest)) continue;
    const m = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    const cover = null; // built-ins use the hand-drawn covers in the front end (public/js/covers.js)
    const existing = one('SELECT id FROM games WHERE slug=?', slug);
    const fields = [m.title, m.description || '', m.instructions || '', m.category || 'arcade', (m.tags || []).join(','), m.entry || 'index.html', m.accent || null, m.aspect || '16:9'];
    if (existing) {
      run('UPDATE games SET title=?, description=?, instructions=?, category=?, tags=?, entry=?, accent=?, aspect=? WHERE id=?', ...fields, existing.id);
    } else {
      const t = now() - (m.order || 0) * 1000;
      run(`INSERT INTO games (title, description, instructions, category, tags, entry, accent, aspect, slug, kind, cover, cover_seed, featured, author_id, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?, 'builtin', ?, ?, ?, NULL, ?, ?)`, ...fields, slug, cover, m.seed || 1, m.featured ? 1 : 0, t, t);
    }
    n++;
  }
  return n;
}
