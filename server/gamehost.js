// The games origin: serves built-in and uploaded games from a different origin
// than the site, with headers that Unity / WebAssembly builds need, and injects
// the small Snackbar SDK into every HTML page so games can report scores.
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { config, storageDir } from './config.js';

const ENCODED = { '.br': 'br', '.gz': 'gzip' };
const TYPES = {
  '.wasm': 'application/wasm', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.data': 'application/octet-stream', '.json': 'application/json', '.unityweb': 'application/octet-stream',
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.pck': 'application/octet-stream',
};

function setHeaders(res, file) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  let ext = path.extname(file).toLowerCase();
  if (ENCODED[ext]) {
    res.setHeader('Content-Encoding', ENCODED[ext]);
    ext = path.extname(file.slice(0, -ext.length)).toLowerCase();
  }
  if (TYPES[ext]) res.setHeader('Content-Type', TYPES[ext]);
}

let sdkCache = null;
const sdkSource = () => (sdkCache ??= fs.readFileSync(path.join(config.root, 'sdk', 'snackbar-sdk.js'), 'utf8')
  .replace('__SITE_ORIGIN__', config.siteOrigin));

function htmlWithSdk(root) {
  return (req, res, next) => {
    let rel;
    try { rel = decodeURIComponent(req.path); } catch { return res.sendStatus(400); }
    if (!/\.html?$/i.test(rel)) return next();
    const file = path.resolve(root, '.' + rel);
    if (!file.startsWith(path.resolve(root) + path.sep)) return next();
    let stat; try { stat = fs.statSync(file); } catch { return next(); }
    if (!stat.isFile()) return next();
    let html = fs.readFileSync(file, 'utf8');
    const tag = '<script src="/sdk.js"></script>';
    // after <head> if there is one (not <header>!), otherwise at the very top
    html = /<head(\s[^>]*)?>/i.test(html) ? html.replace(/<head(\s[^>]*)?>/i, m => m + tag) : tag + html;
    setHeaders(res, file);
    res.setHeader('Cache-Control', 'no-cache');
    // Game pages may only be framed by the site itself (stops hotlinking and clickjacking).
    res.setHeader('Content-Security-Policy', `frame-ancestors ${config.siteOrigin}`);
    res.send(html);
  };
}

export function createGameHost() {
  const app = express();
  app.disable('x-powered-by');
  // The play host only holds raw game files; the game's real page lives on the site.
  app.use((_req, res, next) => { res.setHeader('X-Robots-Tag', 'noindex, nofollow'); next(); });
  app.get('/robots.txt', (_req, res) => res.type('text/plain').send('User-agent: *\nAllow: /\n'));
  app.get('/sdk.js', (_req, res) => { res.type('application/javascript').set('Access-Control-Allow-Origin', '*').send(sdkSource()); });

  // Shared kit for the built-in games, and the site font so games don't need Google Fonts.
  app.use('/kit', express.static(path.join(config.builtinGamesDir, '_kit'), { setHeaders, maxAge: '1h' }));
  app.use('/fonts', express.static(path.join(config.publicDir, 'fonts'), { setHeaders, maxAge: '30d', immutable: true }));

  for (const [prefix, root] of [['/builtin', config.builtinGamesDir], ['/g', storageDir]]) {
    app.use(`${prefix}/:slug`, (req, res, next) => {
      if (!/^[a-z0-9-]+$/.test(req.params.slug)) return res.sendStatus(404);
      const dir = path.join(root, req.params.slug);
      htmlWithSdk(dir)(req, res, () => express.static(dir, { setHeaders, maxAge: '1h', fallthrough: true })(req, res, next));
    });
  }
  app.get('/', (_req, res) => res.redirect(config.siteOrigin));
  app.use((_req, res) => res.status(404).type('text').send('Not found'));
  return app;
}
