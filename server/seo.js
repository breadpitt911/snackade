// Server-side SEO: every page URL gets its own <title>, description, canonical,
// social tags, structured data and a plain-HTML version of the content, plus the
// right status code (real 404s, not soft ones). The SPA then takes over in the
// browser. Also serves robots.txt and sitemap.xml.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { config } from './config.js';
import { one, all } from './db.js';
import { CATEGORIES } from './uploads.js';
import { legalPage, LEGAL_UPDATED } from './legal.js';
import { listComments, standings, pastWinners, monthOf, RATING_LABELS } from './community.js';

export { CATEGORY_INFO } from './categories.js';
import { CATEGORY_INFO } from './categories.js';
import { metaPayload } from './meta.js';
import { logo, icon } from '../public/js/art.js';
import { skeleton } from '../public/js/skeleton.js';

const SITE = () => config.siteOrigin;
const NAME = () => config.siteName;
const TAGLINE = 'Free browser games, no downloads';
const HOME_DESC = "Free games you play right in your browser. Arcade, shooters, puzzles and more, no downloads. Upload your own game and level up while you're at it.";

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clip = (s, n = 158) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/[\s,.;:!-]+\S*$/, '') + '…'; };
const abs = p => SITE() + p;
const ld = obj => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

const LIVE = "g.status='live'";
const gameLinks = (games) => games.length ? `<ul class="ssr-list">${games.map(g =>
  `<li><a href="/game/${esc(g.slug)}">${esc(g.title)}</a>${g.description ? ` <span>${esc(clip(g.description, 110))}</span>` : ''}</li>`).join('')}</ul>` : '';
const catLinks = () => `<ul class="ssr-cats">${CATEGORIES.map(c => `<li><a href="/games/${c}">Free ${esc(CATEGORY_INFO[c].noun)} games</a></li>`).join('')}</ul>`;
const listGames = (where, order, limit, ...p) => all(`SELECT g.*, u.username a_username, u.display_name a_display FROM games g
  LEFT JOIN users u ON u.id=g.author_id WHERE ${LIVE} ${where ? 'AND ' + where : ''} ORDER BY ${order} LIMIT ${limit}`, ...p);

// ---------- per-route page data ----------
function pageFor(pathname, query) {
  let m;
  if (pathname === '/') {
    const popular = listGames('', 'g.featured DESC, g.plays DESC', 24);
    return {
      title: `${NAME()} · ${TAGLINE}`, description: HOME_DESC, canonical: '/',
      jsonld: [
        { '@context': 'https://schema.org', '@type': 'WebSite', name: NAME(), url: abs('/'), description: HOME_DESC },
        { '@context': 'https://schema.org', '@type': 'Organization', name: NAME(), url: abs('/'), logo: abs('/img/icon-512.png') },
      ],
      body: `<h1>Free browser games. Hit play, you're in.</h1><p>${esc(HOME_DESC)}</p>
        <h2>Popular right now</h2>${gameLinks(popular)}<h2>Browse by category</h2>${catLinks()}
        <p><a href="/games">All games</a> · <a href="/upload">Upload your game</a> · <a href="/leaderboard">Leaderboard</a></p>`,
    };
  }
  if (pathname === '/games') {
    const games = listGames('', 'g.plays DESC', 60);
    // Search results and filtered/sorted variants are thin duplicates: keep them out of the index.
    const filtered = ['q', 'source', 'sort', 'offset'].some(k => query.has(k));
    return {
      title: `All free browser games · ${NAME()}`, canonical: '/games', noindex: filtered,
      description: `Every game on ${NAME()} in one place. All free, all playable right in your browser, no downloads.`,
      body: `<h1>Every game</h1><p>All free, all playable right here in your browser.</p>${gameLinks(games)}<h2>Browse by category</h2>${catLinks()}`,
    };
  }
  if ((m = pathname.match(/^\/games\/([a-z]+)$/))) {
    const cat = m[1], info = CATEGORY_INFO[cat];
    if (!info) return null;
    const games = listGames('g.category=?', 'g.plays DESC', 60, cat);
    return {
      title: `Free ${info.noun} games, play online · ${NAME()}`, description: clip(info.intro), canonical: `/games/${cat}`,
      noindex: games.length === 0 || ['q', 'source', 'sort', 'offset'].some(k => query.has(k)),
      jsonld: [breadcrumbs([['Games', '/games'], [info.name, `/games/${cat}`]])],
      body: `<h1>Free ${esc(info.noun)} games</h1><p>${esc(info.intro)}</p>${gameLinks(games) || '<p>Nothing here yet.</p>'}<h2>Other categories</h2>${catLinks()}`,
    };
  }
  if ((m = pathname.match(/^\/game\/([a-z0-9-]+)$/))) {
    const g = one(`SELECT g.*, u.username a_username, u.display_name a_display FROM games g LEFT JOIN users u ON u.id=g.author_id WHERE g.slug=? AND ${LIVE}`, m[1]);
    if (!g) return null;
    const info = CATEGORY_INFO[g.category] || CATEGORY_INFO.arcade;
    const url = `/game/${g.slug}`;
    const desc = clip(g.description || `${g.title} is a free ${info.noun} game you can play right in your browser on ${NAME()}.`);
    const image = g.cover ? abs(`/covers/${g.cover}`) : null;
    const related = listGames('g.category=? AND g.id<>?', 'g.plays DESC', 8, g.category, g.id);
    const comments = listComments(g.id, { limit: 10 }).items;
    const author = g.author_id ? { '@type': 'Person', name: g.a_display, url: abs(`/u/${g.a_username}`) } : { '@type': 'Organization', name: NAME(), url: abs('/') };
    return {
      title: `${g.title} · Play free online · ${NAME()}`, description: desc, canonical: url, image, ogType: 'website',
      jsonld: [
        {
          '@context': 'https://schema.org', '@type': 'VideoGame', name: g.title, url: abs(url), description: g.description || desc,
          genre: info.name, gamePlatform: 'Web browser', applicationCategory: 'Game', operatingSystem: 'Any',
          playMode: g.category === 'multiplayer' ? 'MultiPlayer' : 'SinglePlayer',
          author, publisher: { '@type': 'Organization', name: NAME(), url: abs('/') },
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
          datePublished: new Date(g.created_at).toISOString(), dateModified: new Date(g.updated_at).toISOString(),
          keywords: g.tags || undefined, ...(image ? { image } : {}),
          interactionStatistic: { '@type': 'InteractionCounter', interactionType: 'https://schema.org/PlayAction', userInteractionCount: g.plays },
          ...(g.rating_count ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: Math.round((g.rating_sum / g.rating_count) * 10) / 10, ratingCount: g.rating_count, bestRating: 5, worstRating: 1 } } : {}),
          ...(g.comment_count ? { commentCount: g.comment_count } : {}),
        },
        breadcrumbs([['Games', '/games'], [info.name, `/games/${g.category}`], [g.title, url]]),
      ],
      body: `<nav class="ssr-crumbs"><a href="/games">Games</a> › <a href="/games/${esc(g.category)}">${esc(info.name)}</a></nav>
        <h1>${esc(g.title)}</h1>
        <p>${g.author_id ? `Made by <a href="/u/${esc(g.a_username)}">${esc(g.a_display)}</a>` : `A ${esc(NAME())} original`}. Free to play in your browser, no download.</p>
        ${g.description ? `<p>${esc(g.description)}</p>` : ''}
        ${g.instructions ? `<h2>How to play</h2><p>${esc(g.instructions)}</p>` : ''}
        ${g.rating_count ? `<h2>Snack Score</h2><p>Rated ${(g.rating_sum / g.rating_count).toFixed(1)} out of 5 by ${g.rating_count} ${g.rating_count === 1 ? 'player' : 'players'}.</p>` : ''}
        ${comments.length ? `<h2>What players say</h2><ul class="ssr-list">${comments.map(c => `<li><b>${esc(c.display_name)}</b>${c.stars ? ` (${c.stars}/5, ${esc(RATING_LABELS[c.stars])})` : ''}: <span>${esc(clip(c.body, 300))}</span></li>`).join('')}</ul>` : ''}
        ${related.length ? `<h2>More ${esc(info.noun)} games</h2>${gameLinks(related)}` : ''}`,
    };
  }
  if ((m = pathname.match(/^\/u\/([A-Za-z0-9_]+)$/))) {
    const u = one('SELECT * FROM users WHERE username=?', m[1]);
    if (!u) return null;
    const games = listGames('g.author_id=?', 'g.created_at DESC', 60, u.id);
    return {
      title: `${u.display_name} (@${u.username}) · ${NAME()}`, canonical: `/u/${u.username}`,
      description: clip(u.bio || (games.length ? `Games by ${u.display_name} on ${NAME()}. Play them free in your browser.` : `${u.display_name}'s player profile on ${NAME()}.`)),
      // Profiles without any games are thin: fine to visit, not worth indexing.
      noindex: games.length === 0, ogType: 'profile',
      body: `<h1>${esc(u.display_name)}</h1>${u.bio ? `<p>${esc(u.bio)}</p>` : ''}${games.length ? `<h2>Games by ${esc(u.display_name)}</h2>${gameLinks(games)}` : ''}`,
    };
  }
  if (pathname === '/hall-of-fame') {
    const past = pastWinners(24).filter(m => m.winners.length);
    const race = standings(monthOf(Date.now()), 10).filter(r => r.eligible);
    const monthName = m => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5) - 1, 1)).toLocaleString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const latest = past[0]?.winners.find(w => w.place === 1);
    return {
      title: `Hall of Fame: Game of the Month winners · ${NAME()}`, canonical: '/hall-of-fame',
      description: clip(latest ? `${latest.title} is ${NAME()}'s Game of the Month for ${monthName(past[0].month)}. See every monthly winner, and this month's race for the crown, voted by players.`
        : `Every month the best-rated game on ${NAME()} gets crowned Game of the Month, voted by players. See this month's race.`),
      jsonld: past.length ? [{ '@context': 'https://schema.org', '@type': 'ItemList', name: `${NAME()} Game of the Month winners`,
        itemListElement: past.map((m, i) => { const w = m.winners.find(x => x.place === 1); return w && { '@type': 'ListItem', position: i + 1, name: `${monthName(m.month)}: ${w.title}`, url: abs(`/game/${w.slug}`) }; }).filter(Boolean) }] : [],
      body: `<h1>Hall of Fame</h1><p>Every month, the best-rated game takes the crown. Players rate what they play, and the winner locks in when the month ends.</p>
        <h2>This month's race</h2>${race.length ? `<ol class="ssr-list">${race.map(r => `<li><a href="/game/${esc(r.slug)}">${esc(r.title)}</a> <span>${r.avg.toFixed(1)}/5 from ${r.votes} ratings</span></li>`).join('')}</ol>` : '<p>No ratings yet this month.</p>'}
        ${past.map(m => `<h2>${esc(monthName(m.month))}</h2><ol class="ssr-list">${m.winners.map(w => `<li><a href="/game/${esc(w.slug)}">${esc(w.title)}</a> <span>${w.avg.toFixed(1)}/5 from ${w.votes} ratings</span></li>`).join('')}</ol>`).join('')}`,
    };
  }
  if (pathname === '/leaderboard') return {
    title: `Leaderboard · ${NAME()}`, canonical: '/leaderboard',
    description: `Who's earning the most XP on ${NAME()} this week and all time, and which game makers are getting the most plays.`,
    body: '<h1>Leaderboard</h1><p>You earn XP for playing, scoring and making games. Here\'s who\'s grinding hardest.</p>',
  };
  if (pathname === '/upload') return {
    title: `Upload your game · ${NAME()}`, canonical: '/upload', noindex: true,
    description: `Put your browser game on ${NAME()}. HTML5 zip, a single HTML file, a GitHub repo, Unity WebGL or a hosted link.`,
    body: '<h1>Upload your game</h1>',
  };
  if ((m = pathname.match(/^\/(terms|privacy)$/))) {
    const l = legalPage(m[1]);
    return {
      title: `${l.title} · ${NAME()}`, canonical: pathname, description: l.description,
      body: `<h1>${esc(l.title)}</h1><p><small>Last updated ${esc(l.updatedText)}</small></p><div class="legal-body">${l.html}</div>`,
    };
  }
  const simple = { '/login': 'Sign in', '/signup': 'Create an account', '/settings': 'Settings', '/admin': 'Admin', '/admin/games': 'Admin', '/admin/players': 'Admin', '/admin/reports': 'Reports' }[pathname];
  if (simple) return { title: `${simple} · ${NAME()}`, canonical: pathname, noindex: true, description: HOME_DESC, body: `<h1>${simple}</h1>` };
  return null;
}

function breadcrumbs(items) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(p) })),
  };
}

// ---------- HTML ----------
// Code and styles are served from /v/<hash>/..., where the hash changes whenever any of those
// files change. Browsers (and Cloudflare) can then cache them for a year, and a deploy can never
// leave someone running old scripts against the new server. Relative imports inside the
// scripts resolve under the same /v/<hash>/ prefix automatically.
function hashDir(dir, h) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) hashDir(f, h); else h.update(e.name).update(fs.readFileSync(f));
  }
  return h;
}
const computeVersion = () => hashDir(path.join(config.publicDir, 'css'), hashDir(path.join(config.publicDir, 'js'), crypto.createHash('sha1'))).digest('hex').slice(0, 10);
const PROD = process.env.NODE_ENV === 'production';
let versionCache = null, shellCache = null;
export const assetVersion = () => (PROD && versionCache) || (versionCache = computeVersion());
const shell = () => {
  if (PROD && shellCache) return shellCache;
  const v = assetVersion();
  return (shellCache = fs.readFileSync(path.join(config.publicDir, 'index.html'), 'utf8')
    .replace(/(href|src)="\/(css|js)\//g, `$1="/v/${v}/$2/`));
};

function headTags(p) {
  const url = abs(p.canonical || '/');
  const image = p.image || abs('/img/og.png');
  return [
    `<title>${esc(p.title)}</title>`,
    `<meta name="description" content="${esc(p.description)}">`,
    p.noindex ? '<meta name="robots" content="noindex, follow">' : '<meta name="robots" content="index, follow, max-image-preview:large">',
    p.status === 404 ? '' : `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:site_name" content="${esc(NAME())}">`,
    `<meta property="og:type" content="${p.ogType || 'website'}">`,
    `<meta property="og:title" content="${esc(p.title.replace(` · ${NAME()}`, ''))}">`,
    `<meta property="og:description" content="${esc(p.description)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    p.image ? '' : '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">',
    `<meta property="og:locale" content="en_US">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    ...(p.jsonld || []).map(ld),
  ].filter(Boolean).join('\n');
}

// The header and footer as they look to a signed-out visitor; the app takes them over once it starts.
const topbarHtml = () => `<div class="wrap">
    <a class="logo" href="/" aria-label="${esc(NAME())} home">${logo()}<span>${esc(NAME())}</span></a>
    <nav class="nav" aria-label="Main"><a href="/games">Games</a><a href="/hall-of-fame">Hall of Fame</a><a href="/leaderboard">Leaderboard</a></nav>
    <form class="search" role="search" action="/games">${icon('search')}<input name="q" type="search" placeholder="Search games" aria-label="Search games"></form>
    <div class="me"><a class="btn lemon small upload-btn" href="/upload">${icon('upload')}<span>Upload</span></a></div></div>`;
const footHtml = () => `<div class="wrap">
    <div style="display:flex;align-items:center;gap:10px">${logo(30)}<span>Games for when you've got five minutes. Or five hours.</span></div>
    <nav aria-label="Footer"><a href="/games">Games</a><a href="/upload">Upload</a><a href="/hall-of-fame">Hall of Fame</a><a href="/leaderboard">Leaderboard</a><a href="/leaderboard#xp">How XP works</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a></nav></div>`;

export function renderPage(req) {
  const url = new URL(req.originalUrl, 'http://x');
  let p = pageFor(url.pathname, url.searchParams);
  let status = 200;
  if (!p) {
    status = 404;
    p = { status, title: `Not found · ${NAME()}`, noindex: true, description: HOME_DESC,
      body: `<h1>Nothing on this shelf</h1><p>That page doesn't exist, or the game got pulled.</p><p><a href="/games">Find something to play</a></p>` };
  }
  const theme = (/(?:^|;\s*)theme=(light|dark)/.exec(req.headers.cookie || '') || [])[1];
  const html = shell()
    .replace('<!--THEME-->', theme ? ` data-theme="${theme}" data-theme-choice="${theme}"` : '')
    .replace('<!--SEO-->', () => headTags(p))   // function form: user text containing "$&" stays literal
    .replace('<!--TOPBAR-->', topbarHtml)
    .replace('<!--FOOT-->', footHtml)
    .replace('<!--META-->', () => JSON.stringify(metaPayload()).replace(/</g, '\\u003c'))
    // Skeleton for people with JavaScript, the plain version for crawlers and everyone else.
    .replace('<!--SSR-->', () => `<div class="boot-sk" aria-hidden="true">${skeleton(url.pathname)}</div><div class="wrap ssr" data-ssr>${p.body}</div>`);
  return { status, html };
}

// ---------- robots + sitemap ----------
export function robots() {
  return `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\n\nSitemap: ${abs('/sitemap.xml')}\n`;
}

let sitemapCache = { at: 0, xml: '' };
export function sitemap() {
  if (Date.now() - sitemapCache.at < 10 * 60e3) return sitemapCache.xml;
  const day = ts => new Date(ts).toISOString().slice(0, 10);
  const latest = one(`SELECT MAX(updated_at) t FROM games g WHERE ${LIVE}`).t || Date.now();
  const lastAward = one('SELECT MAX(finalized_at) t FROM monthly_results').t;
  const urls = [['/', latest], ['/games', latest], ['/hall-of-fame', lastAward], ['/leaderboard', null], ['/terms', Date.parse(LEGAL_UPDATED)], ['/privacy', Date.parse(LEGAL_UPDATED)]];
  for (const r of all(`SELECT category, MAX(updated_at) t FROM games g WHERE ${LIVE} GROUP BY category`)) urls.push([`/games/${r.category}`, r.t]);
  for (const g of all(`SELECT slug, updated_at FROM games g WHERE ${LIVE} ORDER BY plays DESC LIMIT 45000`)) urls.push([`/game/${g.slug}`, g.updated_at]);
  for (const u of all(`SELECT u.username, MAX(g.updated_at) t FROM users u JOIN games g ON g.author_id=u.id WHERE ${LIVE} GROUP BY u.id LIMIT 4000`)) urls.push([`/u/${u.username}`, u.t]);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([p, t]) =>
    `  <url><loc>${esc(abs(p))}</loc>${t ? `<lastmod>${day(t)}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`;
  sitemapCache = { at: Date.now(), xml };
  return xml;
}
export const clearSitemapCache = () => { sitemapCache.at = 0; };
