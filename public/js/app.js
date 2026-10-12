import { state, api, setMe, onMeChange, setRouter, go, esc, icon, logo, levelRing, avatarHtml, fmt, $ } from './core.js';
import { loadingArt } from './art.js';

const ROUTES = [
  [/^\/$/, () => import('./views/home.js')],
  [/^\/games\/?$/, () => import('./views/browse.js')],
  [/^\/game\/([a-z0-9-]+)\/?$/, () => import('./views/game.js')],
  [/^\/upload\/?$/, () => import('./views/upload.js')],
  [/^\/u\/([A-Za-z0-9_]+)\/?$/, () => import('./views/profile.js')],
  [/^\/settings\/?$/, () => import('./views/settings.js')],
  [/^\/leaderboard\/?$/, () => import('./views/leaderboard.js')],
  [/^\/(login|signup)\/?$/, () => import('./views/auth.js')],
];

const main = document.getElementById('main');
let cleanup = null, navToken = 0;

async function route() {
  const path = location.pathname;
  const token = ++navToken;
  cleanup?.(); cleanup = null;
  closeMenu();
  const match = ROUTES.find(([re]) => re.test(path));
  if (!match) return notFound();
  main.innerHTML = `<div class="loading" aria-label="Loading">${loadingArt()}</div>`;
  try {
    const mod = await match[1]();
    if (token !== navToken) return;
    const params = path.match(match[0]).slice(1);
    const out = await mod.render(main, params, new URLSearchParams(location.search));
    if (token !== navToken) { out?.(); return; }
    cleanup = typeof out === 'function' ? out : null;
  } catch (e) {
    if (token !== navToken) return;
    if (e.status === 404) return notFound(e.message);
    console.error(e);
    main.innerHTML = `<div class="wrap empty"><h2>That didn't load</h2><p class="muted">${esc(e.message)}</p><button class="btn" id="retry">Try again</button></div>`;
    $('#retry')?.addEventListener('click', route);
  }
  updateNav();
  if (!location.hash) scrollTo(0, 0);
  main.focus({ preventScroll: true });
}
function notFound(msg) {
  document.title = 'Not found';
  main.innerHTML = `<div class="wrap empty" style="padding:80px 20px">${logo(90)}<h1 style="font-size:3rem">Nothing on this shelf</h1>
  <p class="muted">${esc(msg || "That page doesn't exist, or the game was taken down.")}</p><a class="btn primary" href="/games">Browse games</a></div>`;
}

// ---------- chrome ----------
function renderTopbar() {
  const me = state.me;
  document.getElementById('topbar').innerHTML = `<div class="wrap">
    <a class="logo" href="/" aria-label="${esc(state.meta.siteName)} home">${logo()}<span>${esc(state.meta.siteName)}</span></a>
    <nav class="nav" aria-label="Main"><a href="/games">Games</a><a href="/leaderboard">Leaderboard</a></nav>
    <form class="search" role="search" id="search">${icon('search')}<input name="q" type="search" placeholder="Search games" aria-label="Search games" value="${esc(new URLSearchParams(location.search).get('q') || '')}"></form>
    <div class="me">
      <a class="btn lemon small upload-btn" href="/upload">${icon('upload')}<span>Upload</span></a>
      ${me ? `<a class="xpchip" href="/u/${esc(me.username)}" title="Level ${me.progress.level} · ${fmt(me.xp)} XP">${levelRing(me.progress.level, me.progress.pct)}<span><small>${esc(me.progress.title)}</small><b class="num">${fmt(me.xp)} XP</b></span></a>
        <button class="avatar-btn" id="avatar-btn" aria-haspopup="menu" aria-expanded="false" aria-label="Account menu">${avatarHtml(me)}</button>`
        : `<a class="btn small" href="/login">Sign in</a>`}
    </div></div>`;
  $('#search').addEventListener('submit', e => {
    e.preventDefault();
    const q = e.target.q.value.trim();
    go('/games' + (q ? '?q=' + encodeURIComponent(q) : ''));
  });
  $('#avatar-btn')?.addEventListener('click', e => { e.stopPropagation(); toggleMenu(); });
  updateNav();
}
function updateNav() {
  document.querySelectorAll('.nav a').forEach(a => { if (location.pathname.startsWith(a.getAttribute('href'))) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
}
let menuEl = null;
function toggleMenu() {
  if (menuEl) return closeMenu();
  const me = state.me;
  menuEl = document.createElement('div');
  menuEl.className = 'menu'; menuEl.setAttribute('role', 'menu');
  menuEl.innerHTML = `<a role="menuitem" href="/u/${esc(me.username)}">Your profile</a><a role="menuitem" href="/settings">Edit profile</a><a role="menuitem" href="/upload">Upload a game</a><button role="menuitem" id="logout">Sign out</button>`;
  document.getElementById('topbar').appendChild(menuEl);
  $('#avatar-btn')?.setAttribute('aria-expanded', 'true');
  menuEl.querySelector('#logout').addEventListener('click', async () => { await api('/auth/logout', { method: 'POST' }); setMe(null); closeMenu(); go('/'); });
  menuEl.querySelector('a').focus();
}
function closeMenu() { menuEl?.remove(); menuEl = null; $('#avatar-btn')?.setAttribute('aria-expanded', 'false'); }
document.addEventListener('click', e => { if (menuEl && !menuEl.contains(e.target)) closeMenu(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

function renderFooter() {
  const theme = (() => { try { return localStorage.getItem('theme') || 'auto'; } catch { return 'auto'; } })();
  applyTheme(theme);
  document.getElementById('foot').innerHTML = `<div class="wrap">
    <div style="display:flex;align-items:center;gap:10px">${logo(30)}<span>Bite-sized games, made by people like you.</span></div>
    <nav aria-label="Footer"><a href="/games">Games</a><a href="/upload">Upload</a><a href="/leaderboard">Leaderboard</a><a href="/leaderboard#xp">How XP works</a></nav>
    <button class="theme-toggle" id="theme">Theme: ${theme}</button></div>`;
  $('#theme').addEventListener('click', () => {
    const next = { auto: 'light', light: 'dark', dark: 'auto' }[document.documentElement.dataset.themeChoice || 'auto'];
    try { localStorage.setItem('theme', next); } catch { /* private mode */ }
    applyTheme(next); $('#theme').textContent = 'Theme: ' + next;
  });
}
function applyTheme(t) {
  document.documentElement.dataset.themeChoice = t;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = t;
}

// ---------- boot ----------
(async function boot() {
  const [meta, me] = await Promise.all([api('/meta'), api('/me').catch(() => ({ user: null }))]);
  state.meta = meta; state.me = me.user;
  renderTopbar(); renderFooter();
  onMeChange(renderTopbar);
  setRouter(route);
  route();
})();
