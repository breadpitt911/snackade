# Snackbar

Bite-sized browser games, with XP for playing *and* making them. A modern take on the old Miniclip idea: open a page, hit play, no installs.

- **Three original starter games** — *Gobble Grid* (maze chase), *Bunker Blitz* (raycast FPS shooter) and *Cave Hopper* (one-button flyer).
- **Uploads in five formats** — zipped HTML5 builds, single `.html` files, GitHub repos, Unity WebGL builds and hosted URLs.
- **XP, levels, badges and leaderboards** — earned for playing, scoring, liking, publishing, and when other people play or like your games. Every award is logged so real rewards can be added later.
- **Sandboxed by design** — games are served from a separate origin, so uploaded code can never touch the site's cookies or API.

No build step and no native dependencies: Node 22.13+ (uses the built-in SQLite) plus three npm packages.

## Community

- **Snack Score:** players rate games from 1 to 5 bites after playing them (not their own). Ratings show on cards and game pages and feed the game's structured data.
- **Comments** on every game. The author, the game's owner and admins can delete them, and there are spam limits.
- **Hall of Fame** (`/hall-of-fame`): a live race for the current month and podiums for past months. Months lock in automatically within an hour of ending (UTC), using a weighted average with a 3-rating minimum. The winning maker gets 500 XP and the Game of the Month badge.

## Quick start

```bash
npm install
npm start
```

Site: http://localhost:8080 · Games origin: http://localhost:8081

The **first account you create is the admin** (can feature, hide or delete any game). Add more admins with `ADMIN_USERNAMES=alice,bob`.

## Adding your own games

**From GitHub (as official "Snackbar original" games):**

```bash
npm run import-github -- https://github.com/you/space-rocks --title "Space Rocks" --category shooter --featured
npm run import-github -- https://github.com/you/games/tree/main/puzzler --aspect 4:3
```

Options: `--title --description --instructions --category --tags "a,b" --branch --subdir --aspect --featured`.
The importer looks for `index.html` in the repo root, `dist/`, `build/`, `docs/`, `public/`, `www/` or `web/`. Repos that need a build step must commit their built output. Set `GITHUB_TOKEN` for private repos or to avoid GitHub's anonymous rate limit.

**As a folder:** drop a folder into `games/` containing `index.html` and a `game.json` (copy one of the starter games' manifests) and restart. It is registered automatically.

**Through the site:** anyone signed in can use `/upload`.

| Format | What to upload | Notes |
|---|---|---|
| HTML5 zip | A zip containing `index.html` | Phaser, PixiJS, Three.js, Construct, GDevelop, Godot web exports |
| Single HTML | One `.html` file | Up to 15 MB |
| GitHub repo | A public repo link | Branch and sub-folder optional, or paste a `/tree/branch/folder` link |
| Unity WebGL | The zipped WebGL build folder | Brotli/Gzip files get the right `Content-Encoding`; a loader page is generated if `index.html` is missing (2020+ and legacy `UnityLoader` builds) |
| Hosted URL | An `https://` link | The other site must allow framing |

Limits live in `server/config.js`: 95 MB uploads by default (`MAX_UPLOAD_MB`, kept under Cloudflare's 100 MB free-plan cap), 800 MB unzipped, 8,000 files.

## Leaderboards from inside a game

Every HTML page served from the games origin gets a tiny SDK injected automatically:

```js
Snackbar.submitScore(score);   // posts to that game's leaderboard (XP for signed-in players)
Snackbar.gameOver(score);      // same, and marks the run finished
Snackbar.onPause(() => …);     // the player switched tabs
```

Guard calls with `if (window.Snackbar)` (or use `SnackbarGames` if your game already has its own `Snackbar` UI helper) so the game still runs elsewhere. Hosted-URL games can load the SDK from `<GAMES_ORIGIN>/sdk.js`.

Scores are reported by the browser, so treat leaderboards as "for fun" until you add server-side verification for specific games (the hook is `POST /api/games/:slug/score` in `server/api.js`).

## XP rules

All in `server/xp.js`: the `RULES` table, the level curve (`xpToReach(level) = 50·level·(level−1)`), level titles and badge definitions. Every award has a dedupe key so it can't be farmed (one play award per game per day, one like award per person per game, and so on). The leaderboard page renders the same table, so it stays in sync.

## Deploying

**Free hosting on Oracle Cloud + Cloudflare: follow [DEPLOY.md](DEPLOY.md).** It's a step-by-step guide with a one-command setup script.

The general idea, for any host:

The one hard requirement is **two hostnames**: one for the site, one for games, e.g. `snackbar.games` and `play.snackbar.games`. That separation is what keeps uploaded games from acting as the logged-in player.

```bash
NODE_ENV=production \
SITE_ORIGIN=https://snackbar.games \
GAMES_ORIGIN=https://play.snackbar.games \
PORT=8080 GAMES_PORT=8080 \
DATA_DIR=/var/lib/snackbar \
npm start
```

With `GAMES_PORT` equal to `PORT`, one process answers both hostnames (it routes by `Host` header). Point both domains at it behind a TLS proxy (Cloudflare Tunnel, Caddy, nginx, a PaaS). Or keep two ports and route each domain to its own port.

`DATA_DIR` holds the SQLite database, uploaded games and covers. Put it on a persistent volume and back it up. A `Dockerfile` is included:

```bash
docker build -t snackbar .
docker run -p 8080:8080 -v snackbar-data:/data \
  -e SITE_ORIGIN=https://snackbar.games -e GAMES_ORIGIN=https://play.snackbar.games snackbar
```

### Environment variables

| Variable | Default | |
|---|---|---|
| `HOST` | 0.0.0.0 | Address to listen on (`127.0.0.1` behind a tunnel or proxy on the same machine) |
| `PORT` | 8080 | Site port |
| `GAMES_PORT` | 8081 | Games port (set equal to `PORT` for single-port mode) |
| `SITE_ORIGIN` | `http://localhost:8080` | Public URL of the site |
| `GAMES_ORIGIN` | `http://localhost:8081` | Public URL games are served from — must differ from the site |
| `DATA_DIR` | `./data` | Database, uploads, covers |
| `ADMIN_USERNAMES` | | Comma-separated admin usernames (the first account is always admin) |
| `GITHUB_TOKEN` | | For private repos / higher rate limits on imports |
| `SITE_NAME` | Snackbar | Rename the site |
| `MAX_UPLOAD_MB` | 95 | Biggest upload accepted |
| `NODE_ENV` | | `production` enables secure cookies |

## Project layout

```
server/        Express app, API, XP engine, upload pipeline, games origin
  api.js       all /api routes
  xp.js        XP rules, levels, badges
  uploads.js   zip/HTML/GitHub/Unity/URL handling
  gamehost.js  serves games + injects the SDK, Unity headers
public/        the site (vanilla JS modules, no build step)
  css/app.css  design system
  js/art.js    logo, icons, avatars, badge medals, drawn + generated covers
  js/views/    one file per page
games/         built-in games (index.html + game.json each)
sdk/           the in-game SDK
scripts/       import-github CLI
```

## Worth doing next

- Moderation queue (uploads currently go live immediately; admins can hide or delete).
- Email or OAuth sign-in and password reset.
- Store uploads in object storage (S3/R2) for multi-server setups; uploads are buffered in memory today.
- Server-verified scores for chosen games, then real rewards on top of the XP log.
