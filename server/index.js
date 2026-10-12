import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import { config, coversDir } from './config.js';
import { loadUser, csrfGuard } from './auth.js';
import { api } from './api.js';
import { createGameHost } from './gamehost.js';
import { seedBuiltinGames } from './seed.js';

const seeded = seedBuiltinGames();
const gameHost = createGameHost();
const gamesHost = new URL(config.gamesOrigin).host;
const siteHost = new URL(config.siteOrigin).host;
if (gamesHost === siteHost) console.warn('⚠  GAMES_ORIGIN must differ from SITE_ORIGIN, or uploaded games could act as the signed-in player.');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 'loopback');

// Single-port deployments: requests addressed to the games host go to the game host app.
app.use((req, res, next) => (req.headers.host === gamesHost && gamesHost !== siteHost ? gameHost(req, res, next) : next()));

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    `frame-src ${config.gamesOrigin} https:`,
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join('; '));
  next();
});

app.use(express.json({ limit: '64kb' }));
app.use(loadUser);
app.use('/api', csrfGuard, api);
app.use('/covers', express.static(coversDir, { maxAge: '7d' }));
app.use(express.static(config.publicDir, { maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));

// Single-page app: every other GET serves the shell.
const shell = path.join(config.publicDir, 'index.html');
app.get('*', (req, res, next) => (req.accepts('html') ? res.sendFile(shell) : next()));
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(config.port, () => {
  console.log(`🍿 ${config.siteName} running at ${config.siteOrigin}  (${seeded} built-in games)`);
});
if (config.gamesPort && config.gamesPort !== config.port) {
  gameHost.listen(config.gamesPort, () => console.log(`🎮 games served from ${config.gamesOrigin}`));
}
fs.mkdirSync(coversDir, { recursive: true });
