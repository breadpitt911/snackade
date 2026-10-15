import fs from 'node:fs';
import express from 'express';
import { config, coversDir } from './config.js';
import { loadUser, csrfGuard } from './auth.js';
import { api } from './api.js';
import { createGameHost } from './gamehost.js';
import { seedBuiltinGames } from './seed.js';
import { renderPage, robots, sitemap } from './seo.js';
import { finalizeMonths } from './community.js';
import { purgeOldReports } from './moderation.js';

const seeded = seedBuiltinGames();
// Lock in Game of the Month for any month that has ended, now and then hourly.
const decideMonths = () => {
  try { finalizeMonths(console.log); } catch (e) { console.error('monthly awards failed', e); }
  try { purgeOldReports(); } catch (e) { console.error('report cleanup failed', e); }
};
decideMonths();
setInterval(decideMonths, 60 * 60e3).unref();
const gameHost = createGameHost();
const gamesHost = new URL(config.gamesOrigin).host.toLowerCase();
const siteHost = new URL(config.siteOrigin).host.toLowerCase();
if (gamesHost === siteHost) console.warn('⚠  GAMES_ORIGIN must differ from SITE_ORIGIN, or uploaded games could act as the signed-in player.');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 'loopback');

// www.<site> → <site>, so the www address works as soon as it reaches this server.
app.use((req, res, next) => ((req.headers.host || '').toLowerCase() === 'www.' + siteHost ? res.redirect(301, config.siteOrigin + req.originalUrl) : next()));
// Single-port deployments: requests addressed to the games host go to the game host app.
app.use((req, res, next) => ((req.headers.host || '').toLowerCase() === gamesHost && gamesHost !== siteHost ? gameHost(req, res, next) : next()));

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (config.secureCookies) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: blob:",
    `frame-src ${config.gamesOrigin} https:`,
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join('; '));
  next();
});

// One URL per page: drop trailing slashes, retire /index.html and the old ?category= links.
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const [p, qs = ''] = req.originalUrl.split(/\?(.*)/s);
  if (p === '/index.html') return res.redirect(301, '/' + (qs ? '?' + qs : ''));
  if (p.length > 1 && p.endsWith('/') && !p.startsWith('/api/')) return res.redirect(301, p.replace(/\/+$/, '') + (qs ? '?' + qs : ''));
  if (p === '/games' && req.query.category && /^[a-z]+$/.test(req.query.category)) {
    const rest = new URLSearchParams(qs); rest.delete('category');
    return res.redirect(301, `/games/${req.query.category}${rest.size ? '?' + rest : ''}`);
  }
  next();
});
app.get('/robots.txt', (_req, res) => res.type('text/plain').set('Cache-Control', 'public, max-age=3600').send(robots()));
app.get('/sitemap.xml', (_req, res) => res.type('application/xml').set('Cache-Control', 'public, max-age=600').send(sitemap()));

app.use(express.json({ limit: '64kb' }));
app.use(loadUser);
app.use('/api', (_req, res, next) => { res.setHeader('X-Robots-Tag', 'noindex'); next(); }, csrfGuard, api);
app.use('/covers', express.static(coversDir, { maxAge: '7d' }));
// Versioned code and styles (see assetVersion in seo.js): safe to cache forever.
app.use('/v/:v', (req, res, next) => (/^[a-f0-9]{10}$/.test(req.params.v) && /^\/(js|css)\//.test(req.path) ? next() : res.sendStatus(404)),
  express.static(config.publicDir, { index: false, immutable: true, maxAge: '365d' }), (_req, res) => res.sendStatus(404));
// HTML/JS/CSS revalidate on every load (cheap 304s) so a deploy shows up immediately; images cache longer.
app.use(express.static(config.publicDir, {
  index: false,
  setHeaders: (res, file) => res.setHeader('Cache-Control', /\.(html|js|css)$/.test(file) ? 'no-cache' : /\.woff2$/.test(file) ? 'public, max-age=31536000, immutable' : 'public, max-age=86400'),
}));

// Single-page app: every other GET serves the shell, pre-filled with that page's
// title, meta tags and content for search engines, with a real 404 when it doesn't exist.
app.get('*', (req, res, next) => {
  if (!req.accepts('html')) return next();
  const { status, html } = renderPage(req);
  res.status(status).type('html').set('Cache-Control', 'no-cache').send(html);
});
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') return res.status(400).json({ error: 'Bad request.' });
  console.error(err);
  res.status(500).json({ error: 'Something broke on our end.' });
});

app.listen(config.port, config.host, () => {
  console.log(`🍿 ${config.siteName} running at ${config.siteOrigin}  (${seeded} built-in games)`);
});
if (config.gamesPort && config.gamesPort !== config.port) {
  gameHost.listen(config.gamesPort, config.host, () => console.log(`🎮 games served from ${config.gamesOrigin}`));
}
fs.mkdirSync(coversDir, { recursive: true });
