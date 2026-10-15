import { state, api, setMe, onMeChange, setRouter, go, esc, icon, logo, levelRing, avatarHtml, fmt, $ } from './core.js';

const ROUTES = [
  [/^\/$/, () => import('./views/home.js')],
  [/^\/games\/?$/, () => import('./views/browse.js')],
  [/^\/games\/([a-z]+)\/?$/, () => import('./views/browse.js')],
  [/^\/game\/([a-z0-9-]+)\/?$/, () => import('./views/game.js')],
  [/^\/upload\/?$/, () => import('./views/upload.js')],
  [/^\/u\/([A-Za-z0-9_]+)\/?$/, () => import('./views/profile.js')],
  [/^\/settings\/?$/, () => import('./views/settings.js')],
  [/^\/leaderboard\/?$/, () => import('./views/leaderboard.js')],
  [/^\/hall-of-fame\/?$/, () => import('./views/halloffame.js')],
  [/^\/(login|signup)\/?$/, () => import('./views/auth.js')],
  [/^\/(terms|privacy)\/?$/, () => import('./views/legal.js')],
  [/^\/admin\/reports\/?$/, () => import('./views/admin.js')],
  [/^\/admin(?:\/(games|players))?\/?$/, () => import('./views/dashboard.js')],
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
  // First load: the server already put this page's content in <main>, so keep it on screen until the real view is ready.
  // Otherwise keep the old page up for a beat, and only swap in a skeleton if loading takes a while.
  progress.start();
  const skTimer = main.querySelector('[data-ssr]') ? null : setTimeout(() => { if (token === navToken) main.innerHTML = skeleton(path); }, 140);
  try {
    const mod = await match[1]();
    if (token !== navToken) return;
    const params = path.match(match[0]).slice(1);
    const out = await mod.render(main, params, new URLSearchParams(location.search));
    if (token !== navToken) { out?.(); return; }
    cleanup = typeof out === 'function' ? out : null;
    main.firstElementChild?.classList.add('view-in');
  } catch (e) {
    if (token !== navToken) return;
    if (e.status === 404) return notFound(e.message);
    console.error(e);
    main.innerHTML = `<div class="wrap empty"><h2>Well, that didn't load</h2><p class="muted">${esc(e.message)}</p><button class="btn" id="retry">Try again</button></div>`;
    $('#retry')?.addEventListener('click', route);
  }
  finally { clearTimeout(skTimer); if (token === navToken) progress.done(); }
  updateNav();
  if (!location.hash) scrollTo(0, 0);
  main.focus({ preventScroll: true });
}
// Thin bar at the top while a page loads. Stays invisible for fast navigations.
const progress = (() => {
  const el = document.createElement('div');
  el.id = 'navprog'; el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  let t0 = 0;
  return {
    start() { t0 = performance.now(); el.className = ''; void el.offsetWidth; el.className = 'run'; },
    done() { el.className = performance.now() - t0 > 150 ? 'done' : ''; },
  };
})();
const skCards = n => `<div class="shelf">${'<div class="sk-card"><div class="sk sk-img"></div><div class="sk sk-line"></div><div class="sk sk-line short"></div></div>'.repeat(n)}</div>`;
function skeleton(path) {
  const head = '<div class="sk sk-line big"></div><div class="sk sk-line" style="width:min(520px,80%)"></div><div style="height:26px"></div>';
  if (path.startsWith('/game/')) return `<div class="wrap sk-wrap" aria-busy="true" aria-label="Loading"><div class="game-layout"><div><div class="sk sk-stage"></div>
    <div style="height:22px"></div><div class="sk sk-line big"></div><div class="sk sk-line"></div><div class="sk sk-line short"></div></div>
    <aside class="side"><div class="sk sk-panel"></div><div class="sk sk-panel"></div></aside></div></div>`;
  if (/^\/(admin|settings|upload|login|signup|terms|privacy)/.test(path)) return `<div class="wrap sk-wrap" aria-busy="true" aria-label="Loading">${head}<div class="sk sk-panel"></div><div style="height:14px"></div><div class="sk sk-panel short"></div></div>`;
  return `<div class="wrap sk-wrap" aria-busy="true" aria-label="Loading">${head}${skCards(path === '/' ? 5 : 10)}</div>`;
}

function notFound(msg) {
  document.title = `Not found · ${state.meta.siteName}`;
  main.innerHTML = `<div class="wrap empty" style="padding:80px 20px">${logo(90)}<h1 style="font-size:3rem">Nothing on this shelf</h1>
  <p class="muted">${esc(msg || "That page doesn't exist, or the game got pulled.")}</p><a class="btn primary" href="/games">Find something to play</a></div>`;
}

// ---------- chrome ----------
function renderTopbar() {
  const me = state.me;
  document.getElementById('topbar').innerHTML = `<div class="wrap">
    <a class="logo" href="/" aria-label="${esc(state.meta.siteName)} home">${logo()}<span>${esc(state.meta.siteName)}</span></a>
    <nav class="nav" aria-label="Main"><a href="/games">Games</a><a href="/hall-of-fame">Hall of Fame</a><a href="/leaderboard">Leaderboard</a></nav>
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
  menuEl.innerHTML = `<div class="menu-head" role="none"><b>${esc(me.displayName)}</b><small>@${esc(me.username)} · Level ${me.progress.level}</small></div>
    <a role="menuitem" href="/u/${esc(me.username)}">Your profile</a><a role="menuitem" href="/settings">Edit profile</a><a role="menuitem" href="/upload">Upload your game</a><a role="menuitem" href="/hall-of-fame">Hall of Fame</a>${me.isAdmin ? `<a role="menuitem" href="/admin">Admin${me.openReports ? ` <span class="count" title="Open reports">${me.openReports}</span>` : ''}</a>` : ''}<hr role="none"><button role="menuitem" id="logout">Sign out</button>`;
  document.querySelector('#topbar .me').appendChild(menuEl);
  $('#avatar-btn')?.setAttribute('aria-expanded', 'true');
  menuEl.querySelector('#logout').addEventListener('click', async () => { await api('/auth/logout', { method: 'POST' }); setMe(null); closeMenu(); go('/'); });
  menuEl.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  menuEl.querySelector('a').focus();
}
function closeMenu() { menuEl?.remove(); menuEl = null; $('#avatar-btn')?.setAttribute('aria-expanded', 'false'); }
document.addEventListener('click', e => { if (menuEl && !menuEl.contains(e.target)) closeMenu(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

function renderFooter() {
  const theme = (() => { try { return localStorage.getItem('theme') || 'auto'; } catch { return 'auto'; } })();
  applyTheme(theme);
  document.getElementById('foot').innerHTML = `<div class="wrap">
    <div style="display:flex;align-items:center;gap:10px">${logo(30)}<span>Games for when you've got five minutes. Or five hours.</span></div>
    <nav aria-label="Footer"><a href="/games">Games</a><a href="/upload">Upload</a><a href="/hall-of-fame">Hall of Fame</a><a href="/leaderboard">Leaderboard</a><a href="/leaderboard#xp">How XP works</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a></nav>
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
