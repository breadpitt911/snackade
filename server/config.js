import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PORT = Number(process.env.PORT || 8080);
const GAMES_PORT = Number(process.env.GAMES_PORT || 8081);

export const config = {
  siteName: process.env.SITE_NAME || 'Snackade',
  root: ROOT,
  port: PORT,
  // Games are served from a *different origin* than the site so uploaded code can
  // never read the site's cookies or call its API as the logged-in player.
  // Dev: a second port. Production: a separate (sub)domain, e.g. https://play.example.com
  gamesPort: GAMES_PORT,
  gamesOrigin: (process.env.GAMES_ORIGIN || `http://localhost:${GAMES_PORT}`).replace(/\/$/, ''),
  siteOrigin: (process.env.SITE_ORIGIN || `http://localhost:${PORT}`).replace(/\/$/, ''),
  dataDir: path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data')),
  builtinGamesDir: path.join(ROOT, 'games'),
  publicDir: path.join(ROOT, 'public'),
  githubToken: process.env.GITHUB_TOKEN || '',
  admins: (process.env.ADMIN_USERNAMES || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
  secureCookies: process.env.NODE_ENV === 'production',
  limits: {
    htmlFile: 15 * 1024 * 1024,       // single .html
    zip: 300 * 1024 * 1024,           // zipped HTML5 / Unity builds
    unzipped: 800 * 1024 * 1024,
    entries: 8000,
    cover: 3 * 1024 * 1024,
  },
};

export const storageDir = path.join(config.dataDir, 'games');
export const coversDir = path.join(config.dataDir, 'covers');
