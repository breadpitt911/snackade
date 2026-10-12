// Shared plumbing: API calls, app state, navigation, toasts and the XP celebration.
import { esc, avatar, levelRing, medal, icon, logo } from './art.js';
export { esc };

export const state = { me: null, meta: null };
const listeners = new Set();
export const onMeChange = (fn) => listeners.add(fn);
export function setMe(user) { state.me = user; listeners.forEach(fn => fn(user)); }

export async function api(path, opts = {}) {
  const init = { method: opts.method || 'GET', headers: { 'x-snackade': '1' }, credentials: 'same-origin' };
  if (opts.body instanceof FormData) init.body = opts.body;
  else if (opts.body !== undefined) { init.body = JSON.stringify(opts.body); init.headers['content-type'] = 'application/json'; }
  const res = await fetch('/api' + path, init);
  let data = {};
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) { const e = new Error(data.error || `Request failed (${res.status})`); e.status = res.status; throw e; }
  if (data.events?.length) celebrate(data.events);
  return data;
}

// Upload with progress (fetch has no upload progress yet).
export function apiUpload(path, form, onProgress) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('POST', '/api' + path); x.setRequestHeader('x-snackade', '1');
    x.upload.onprogress = e => e.lengthComputable && onProgress?.(e.loaded / e.total);
    x.onload = () => {
      let d = {}; try { d = JSON.parse(x.responseText); } catch { /* empty */ }
      if (x.status >= 400) return reject(new Error(d.error || `Upload failed (${x.status})`));
      if (d.events?.length) celebrate(d.events);
      resolve(d);
    };
    x.onerror = () => reject(new Error("Couldn't reach the server. Check your connection and try again."));
    x.send(form);
  });
}

export async function refreshMe() {
  const d = await api('/me');
  setMe(d.user);
  return d.user;
}

// ---------- navigation ----------
let router = null;
export const setRouter = (fn) => { router = fn; };
export function go(path, { replace = false } = {}) {
  if (replace) history.replaceState({}, '', path); else history.pushState({}, '', path);
  router?.();
}
document.addEventListener('click', e => {
  const a = e.target.closest('a[href]');
  if (!a || a.target || a.hasAttribute('download') || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || url.pathname.startsWith('/api') || url.pathname.startsWith('/covers')) return;
  e.preventDefault();
  go(url.pathname + url.search);
});
addEventListener('popstate', () => router?.());

export function requireLogin(reason) {
  toast(reason || 'Sign in to keep your XP.', { pip: '🔑' });
  go('/login?next=' + encodeURIComponent(location.pathname + location.search));
}

// ---------- small helpers ----------
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const fmt = (n) => Number(n || 0).toLocaleString();
export function compact(n) {
  n = Number(n || 0);
  if (n < 1000) return String(n);
  if (n < 1e6) return (n / 1000).toFixed(n < 1e4 ? 1 : 0).replace(/\.0$/, '') + 'k';
  return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
}
export function ago(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'just now';
  const units = [[31536000, 'year'], [2592000, 'month'], [604800, 'week'], [86400, 'day'], [3600, 'hour'], [60, 'minute']];
  for (const [sec, name] of units) if (s >= sec) { const v = Math.floor(s / sec); return `${v} ${name}${v > 1 ? 's' : ''} ago`; }
}
export const avatarHtml = (u, size) => avatar(u?.avatar || {}, size);
export function title(t) { document.title = t ? `${t} · ${state.meta?.siteName || 'Snackade'}` : `${state.meta?.siteName || 'Snackade'} · bite-sized browser games`; }

// ---------- toasts ----------
export function toast(text, { pip = '★', kind = '', ms = 3600 } = {}) {
  const box = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.innerHTML = `<span class="pip ${kind === 'badge' ? 'badge-pip' : ''}">${pip}</span><span>${text}</span>`;
  box.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 250); }, ms);
}
export const toastError = (msg) => toast(esc(msg), { pip: '!', kind: 'error', ms: 5000 });

// ---------- modal ----------
export function modal(html, { onClose } = {}) {
  const root = document.getElementById('modal-root');
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  const close = () => { back.remove(); document.removeEventListener('keydown', key); onClose?.(); };
  const key = e => { if (e.key === 'Escape') close(); };
  back.addEventListener('click', e => { if (e.target === back || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', key);
  root.appendChild(back);
  back.querySelector('button, a, input')?.focus();
  return close;
}

// ---------- XP celebration ----------
export function celebrate(events) {
  let delay = 0;
  for (const e of events) {
    if (e.type === 'xp') setTimeout(() => toast(esc(e.label), { pip: `+${e.amount}` }), delay);
    if (e.type === 'badge') setTimeout(() => toast(`Badge unlocked: <b>${esc(e.badge.name)}</b>`, { pip: '🏅', kind: 'badge', ms: 5000 }), delay);
    delay += 350;
  }
  const lvl = events.filter(e => e.type === 'level').pop();
  if (lvl) setTimeout(() => levelUp(lvl), delay + 200);
  if (state.me) setTimeout(() => refreshMe().catch(() => {}), 200);
}
function levelUp({ level, title: t }) {
  modal(`<div class="levelup" style="display:grid;gap:10px;justify-items:center">
    ${levelRing(level, 100, 120).replace('class="ring"', 'class="ring medal"')}
    <div class="big">Level ${level}</div>
    <p style="font-size:1.15rem">You're now a <b>${esc(t)}</b>.</p>
    <button class="btn primary" data-close>Keep playing</button></div>`);
  confetti();
}
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas'); c.className = 'confetti'; document.body.appendChild(c);
  const ctx = c.getContext('2d'), dpr = devicePixelRatio || 1;
  c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.scale(dpr, dpr);
  const cols = ['#3346FF', '#FFD23F', '#FF5DA2', '#22C79A', '#FF5A36'];
  const bits = Array.from({ length: 160 }, () => ({ x: innerWidth / 2, y: innerHeight * .45, vx: (Math.random() - .5) * 16, vy: -Math.random() * 16 - 4, r: Math.random() * 6, s: 4 + Math.random() * 6, c: cols[Math.random() * 5 | 0], w: Math.random() * .3 }));
  let t = 0;
  (function tick() {
    ctx.clearRect(0, 0, innerWidth, innerHeight); t++;
    for (const b of bits) { b.x += b.vx; b.y += b.vy; b.vy += .45; b.vx *= .99; b.r += b.w; ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.c; ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); ctx.restore(); }
    if (t < 150) requestAnimationFrame(tick); else c.remove();
  })();
}

export { avatar, levelRing, medal, icon, logo };
