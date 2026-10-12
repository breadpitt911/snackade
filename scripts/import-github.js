#!/usr/bin/env node
// Import a game straight from GitHub as an official "Snackade Team" game (no uploader account).
//
//   npm run import-github -- https://github.com/you/my-game
//   npm run import-github -- https://github.com/you/games/tree/main/space-rocks --title "Space Rocks" --category shooter --featured
//
// Options: --title --description --instructions --category --tags "a,b" --branch --subdir --aspect 4:3 --featured
import { run, one, now } from '../server/db.js';
import { processUpload, uniqueSlug, parseGithubUrl, CATEGORIES } from '../server/uploads.js';

const args = process.argv.slice(2);
const url = args.find(a => !a.startsWith('--') && /github\.com/.test(a));
const opt = (name) => { const i = args.indexOf('--' + name); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : undefined; };
if (!url) {
  console.log('Usage: npm run import-github -- <github repo url> [--title "Name"] [--category arcade] [--featured]');
  process.exit(1);
}

const gh = parseGithubUrl(url);
const title = opt('title') || (gh.subdir.split('/').pop() || gh.repo).replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const slug = uniqueSlug(title);
console.log(`Importing ${url} as "${title}" (${slug})…`);

try {
  const r = await processUpload({ kind: 'github', slug, repoUrl: url, branch: opt('branch'), subdir: opt('subdir') });
  const category = CATEGORIES.includes(opt('category')) ? opt('category') : 'arcade';
  const t = now();
  run(`INSERT INTO games (slug, title, description, instructions, category, tags, kind, entry, source_url, cover_seed, author_id, featured, aspect, size_bytes, created_at, updated_at)
    VALUES (?,?,?,?,?,?, 'github', ?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
    slug, title, opt('description') || '', opt('instructions') || '', category, opt('tags') || '', r.entry, r.sourceUrl,
    Math.floor(Math.random() * 1e6), args.includes('--featured') ? 1 : 0, opt('aspect') || '16:9', r.sizeBytes, t, t);
  console.log(`✓ Added. Entry: ${r.entry} · ${(r.sizeBytes / 1048576).toFixed(1)} MB · /game/${one('SELECT slug FROM games WHERE slug=?', slug).slug}`);
} catch (e) {
  console.error('✗ ' + e.message);
  process.exit(1);
}
