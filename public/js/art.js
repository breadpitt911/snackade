// All of Snackbar's drawn graphics live here as SVG strings: the logo, icons,
// creature avatars, badge medals, hand-drawn covers for the starter games and
// generated covers for everything uploaded without one.
import { MORE_COVERS } from './covers.js';
const INK = '#15131F';
let uid = 0;
const id = (p) => `${p}${++uid}`;
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- logo: a cartridge with a bite out of it ----------
export function logo(size = 42) {
  const m = id('bite'), c = id('bc');
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true">
  <defs><mask id="${m}"><rect width="48" height="48" fill="#fff"/><circle cx="41.5" cy="7" r="6.5" fill="#000"/><circle cx="34" cy="3.5" r="4.6" fill="#000"/></mask>
  <clipPath id="${c}"><rect x="7" y="5" width="34" height="39" rx="6"/></clipPath></defs>
  <rect x="9.5" y="8" width="34" height="39" rx="6" fill="${INK}" mask="url(#${m})"/>
  <g mask="url(#${m})"><rect x="7" y="5" width="34" height="39" rx="6" fill="#3346FF" stroke="${INK}" stroke-width="3"/>
  <rect x="12" y="11" width="24" height="17" rx="3.5" fill="#FFD23F" stroke="${INK}" stroke-width="2.5"/></g>
  <g clip-path="url(#${c})" fill="none" stroke="${INK}" stroke-width="3"><circle cx="41.5" cy="7" r="6.5"/><circle cx="34" cy="3.5" r="4.6"/></g>
  <circle cx="19" cy="18.5" r="2.3" fill="${INK}"/><circle cx="28" cy="18.5" r="2.3" fill="${INK}"/>
  <path d="M19.5 22.5q4 3.4 8 0" fill="none" stroke="${INK}" stroke-width="2.3" stroke-linecap="round"/>
  <g stroke="${INK}" stroke-width="2.3" stroke-linecap="round"><path d="M14 34v5M19 34v5M24 34v5M29 34v5M34 34v5"/></g>
  </svg>`;
}

// ---------- icons (24px, stroke) ----------
const P = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  chat: '<path d="M4 5h16v11H10l-5 4v-4H4z"/>',
  cookie: '<circle cx="12" cy="12" r="9"/><path d="M8.5 10h.01M14 15h.01M9 15.5h.01M15 9.5h.01"/>',
  play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  heartFill: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" fill="currentColor"/>',
  plays: '<path d="M7 4.5v15l13-7.5z"/>',
  upload: '<path d="M12 16V4M6.5 9.5 12 4l5.5 5.5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  zip: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M10 5h2M10 8h2M10 11h2M10 14h2v3h-2z"/>',
  html: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
  github: '<path d="M9 19c-4 1.3-4-2-6-2.5M15 21v-3.5a3 3 0 0 0-.9-2.3c2.9-.3 5.9-1.4 5.9-6.4a5 5 0 0 0-1.4-3.5 4.6 4.6 0 0 0-.1-3.5s-1.1-.3-3.6 1.4a12.4 12.4 0 0 0-6.6 0C5.8 1.5 4.7 1.8 4.7 1.8a4.6 4.6 0 0 0-.1 3.5A5 5 0 0 0 3.2 8.8c0 5 3 6.1 5.9 6.4a3 3 0 0 0-.9 2.3V21"/>',
  cube: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  theatre: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h10"/>',
  restart: '<path d="M4 12a8 8 0 1 0 2.3-5.6L4 8.7M4 4v4.7h4.7"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  // categories
  arcade: '<rect x="3" y="12" width="18" height="8" rx="2"/><path d="M12 12V7"/><circle cx="12" cy="5.5" r="2.5" fill="currentColor"/><circle cx="17" cy="16" r="1" fill="currentColor"/>',
  action: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  shooter: '<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>',
  puzzle: '<path d="M4 8h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4H4v-4a2 2 0 1 0 0-4z"/>',
  racing: '<path d="M5 21V4M5 4h13l-2.5 4L18 12H5"/>',
  sports: '<circle cx="12" cy="12" r="8"/><path d="M4.5 9.5c4 1 11 1 15 0M4.5 14.5c4-1 11-1 15 0M12 4c-2.5 5-2.5 11 0 16"/>',
  platformer: '<path d="M3 20h5v-5h5v-5h5V5h3"/>',
  strategy: '<path d="M8 21h8M9 21l1-7h4l1 7M9 8h6l-1 6h-4zM9 8 8 4l2 1 2-2 2 2 2-1-1 4"/>',
  casual: '<circle cx="12" cy="12" r="8"/><path d="M8.5 14a4 4 0 0 0 7 0"/><circle cx="9" cy="10" r=".8" fill="currentColor"/><circle cx="15" cy="10" r=".8" fill="currentColor"/>',
  multiplayer: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.2A5 5 0 0 1 21.5 19"/>',
};
// ---------- the "bite" used for Snack Score ratings: a cookie with a bite out of it ----------
export function bite(filled, size = 28) {
  const m = id('bt');
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" class="bite ${filled ? 'on' : ''}">
  <defs><mask id="${m}"><rect width="24" height="24" fill="#fff"/><circle cx="21" cy="4" r="4.2" fill="#000"/><circle cx="16.4" cy="2.2" r="2.8" fill="#000"/></mask></defs>
  <g mask="url(#${m})"><circle cx="12" cy="12.5" r="9.5" fill="${filled ? '#F2B45C' : 'none'}" stroke="currentColor" stroke-width="1.9"/>
  ${filled ? '<g fill="#5B3A1E"><circle cx="8.5" cy="10" r="1.3"/><circle cx="13" cy="15.5" r="1.4"/><circle cx="8" cy="16" r="1"/><circle cx="15.5" cy="10.5" r="1"/><circle cx="11.5" cy="12" r=".8"/></g>' : '<g fill="currentColor" opacity=".45"><circle cx="8.5" cy="10" r="1"/><circle cx="13" cy="15.5" r="1"/><circle cx="8" cy="16" r=".8"/></g>'}</g></svg>`;
}

export const icon = (name, size) => `<svg viewBox="0 0 24 24" ${size ? `width="${size}" height="${size}"` : ''} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

export const CAT_COLORS = { arcade: '#FFD23F', action: '#FF5A36', shooter: '#22C79A', puzzle: '#8E6CF0', racing: '#4FC3F7', sports: '#A6E22E', platformer: '#FF5DA2', strategy: '#F2B98C', casual: '#FFB800', multiplayer: '#3346FF' };
export const CAT_NAMES = { arcade: 'Arcade', action: 'Action', shooter: 'Shooters', puzzle: 'Puzzle', racing: 'Racing', sports: 'Sports', platformer: 'Platformers', strategy: 'Strategy', casual: 'Casual', multiplayer: 'Multiplayer' };

// ---------- avatars: little snack creatures ----------
export const AV_COLORS = ['#3346FF', '#FFD23F', '#FF5DA2', '#22C79A', '#FF5A36', '#4FC3F7', '#8E6CF0', '#A6E22E'];
const AV_BG = ['#DCE0FF', '#FFF3C4', '#FFE0EE', '#D2F5EA', '#FFE1D9', '#DDF3FD', '#E9E2FD', '#EDF8D2'];
export function avatar(a = {}, size) {
  const s = (a.shape ?? 0) % 5, c = AV_COLORS[(a.color ?? 0) % 8], bg = AV_BG[(a.color ?? 0) % 8], e = (a.eyes ?? 0) % 5, x = (a.extra ?? 0) % 6;
  const bodies = [
    '<circle cx="50" cy="60" r="30"/>',
    '<rect x="20" y="30" width="60" height="58" rx="20"/>',
    '<path d="M50 28c18 0 32 10 32 30 0 22-12 30-32 30S18 80 18 58c0-20 14-30 32-30z"/>',
    '<path d="M50 24c10 16 30 28 30 42a30 30 0 0 1-60 0c0-14 20-26 30-42z"/>',
    '<path d="M28 88V48a22 22 0 0 1 44 0v40c-5-4-9-4-11 0-3-4-8-4-11 0-3-4-8-4-11 0-2-4-6-4-11 0z"/>',
  ];
  const eyes = [
    '<circle cx="40" cy="56" r="4.5" fill="#15131F"/><circle cx="60" cy="56" r="4.5" fill="#15131F"/>',
    '<circle cx="39" cy="55" r="9" fill="#fff" stroke="#15131F" stroke-width="3"/><circle cx="61" cy="55" r="9" fill="#fff" stroke="#15131F" stroke-width="3"/><circle cx="41" cy="56" r="4" fill="#15131F"/><circle cx="63" cy="56" r="4" fill="#15131F"/>',
    '<path d="M33 57q6-7 12 0M55 57q6-7 12 0" fill="none" stroke="#15131F" stroke-width="3.5" stroke-linecap="round"/>',
    '<circle cx="50" cy="54" r="12" fill="#fff" stroke="#15131F" stroke-width="3"/><circle cx="52" cy="55" r="5.5" fill="#15131F"/><circle cx="54" cy="52.5" r="1.6" fill="#fff"/>',
    '<rect x="28" y="47" width="44" height="15" rx="7.5" fill="#15131F"/><rect x="34" y="51" width="12" height="4" rx="2" fill="#7ff2de"/>',
  ];
  const extras = [
    '',
    '<path d="M50 30V14" stroke="#15131F" stroke-width="3"/><circle cx="50" cy="12" r="5" fill="#FF5A36" stroke="#15131F" stroke-width="3"/>',
    `<path d="M32 38 26 20l14 12M68 38l6-18-14 12" fill="${c}" stroke="#15131F" stroke-width="3" stroke-linejoin="round"/>`,
    '<path d="M50 31c0-8 2-12 8-15-1 7-4 10-8 15z" fill="#7bd94a" stroke="#15131F" stroke-width="2.5"/><path d="M50 31c-1-6-4-9-9-10 0 5 4 9 9 10z" fill="#5fbf35" stroke="#15131F" stroke-width="2.5"/>',
    '<path d="M38 34 50 8l12 26z" fill="#FFD23F" stroke="#15131F" stroke-width="3" stroke-linejoin="round"/><circle cx="50" cy="8" r="4" fill="#FF5DA2" stroke="#15131F" stroke-width="2.5"/><path d="M43 26l5-3M47 32l9-5" stroke="#FF5DA2" stroke-width="3"/>',
    '<path d="M33 36l3-16 8 9 6-12 6 12 8-9 3 16z" fill="#FFD23F" stroke="#15131F" stroke-width="3" stroke-linejoin="round"/>',
  ];
  const mouth = e === 4 ? '<path d="M44 72q6 5 12 0" fill="none" stroke="#15131F" stroke-width="3" stroke-linecap="round"/>' : '<path d="M43 70q7 6 14 0" fill="none" stroke="#15131F" stroke-width="3" stroke-linecap="round"/>';
  return `<svg viewBox="0 0 100 100" ${size ? `width="${size}" height="${size}"` : ''} aria-hidden="true"><rect width="100" height="100" fill="${bg}"/>
  <g transform="translate(3 3)" fill="#15131F" opacity=".9">${bodies[s]}</g>
  <g fill="${c}" stroke="#15131F" stroke-width="3">${bodies[s]}</g>
  <ellipse cx="38" cy="42" rx="6" ry="3.5" fill="#fff" opacity=".4" transform="rotate(-30 38 42)"/>
  ${extras[x]}${eyes[e]}${mouth}
  <circle cx="33" cy="66" r="4" fill="#FF5DA2" opacity=".45"/><circle cx="67" cy="66" r="4" fill="#FF5DA2" opacity=".45"/></svg>`;
}

// ---------- level ring ----------
export function levelRing(level, pct, size = 34) {
  const r = 14, C = 2 * Math.PI * r;
  return `<svg class="ring" viewBox="0 0 34 34" width="${size}" height="${size}" aria-hidden="true">
  <circle cx="17" cy="17" r="${r}" fill="#FFD23F" stroke="#15131F" stroke-width="2.5"/>
  <circle cx="17" cy="17" r="${r}" fill="none" stroke="#3346FF" stroke-width="3.5" stroke-dasharray="${C * pct / 100} ${C}" transform="rotate(-90 17 17)" stroke-linecap="round"/>
  <text x="17" y="21.5" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="13" fill="#15131F">${level}</text></svg>`;
}

// ---------- badge medals ----------
const MEDAL_ICON = {
  joystick: P.arcade, plate: '<ellipse cx="12" cy="14" rx="9" ry="4"/><path d="M8 11c0-3 2-6 4-6s4 3 4 6"/>', wrench: '<path d="M14.5 5.5a4 4 0 0 0 4.9 5.2L11 19a2.1 2.1 0 0 1-3-3l8.3-8.4A4 4 0 0 0 14.5 5.5z"/>',
  stack: '<path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5"/>', crowd: P.multiplayer, heart: P.heart, flag: P.racing,
  crown: '<path d="M4 18 3 7l5 4 4-6 4 6 5-4-1 11z"/>', flame: '<path d="M12 21c4 0 7-3 7-7 0-5-5-7-5-12-3 2-5 5-5 8-1-1-2-2-2-4-1 2-2 4-2 8 0 4 3 7 7 7z"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>', bolt: P.action,
  cake: '<path d="M4 13h16v8H4zM4 16c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 4 0M12 13V9M12 6.5v.5"/>',
  quill: '<path d="M20 4C12 4 7 9 5 19l2 1c1-3 2-5 4-6h4l-2-2 4-1-2-2c2-1 4-3 5-5z"/>',
  bubble: '<path d="M4 5h16v11H10l-5 4v-4H4z"/><path d="M8 10h8M8 13h5"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4c0 3 1.5 4.5 3 5M17 6h3c0 3-1.5 4.5-3 5M12 14v4M8 21h8M9 18h6"/>',
};
const MEDAL_COLORS = { joystick: '#FFD23F', plate: '#22C79A', wrench: '#4FC3F7', stack: '#8E6CF0', crowd: '#FF5A36', heart: '#FF5DA2', flag: '#A6E22E', crown: '#FFB800', flame: '#FF5A36', star: '#FFD23F', bolt: '#3346FF', cake: '#FF5DA2', quill: '#4FC3F7', bubble: '#A6E22E', trophy: '#FFB800' };
export function medal(iconName) {
  const c = MEDAL_COLORS[iconName] || '#FFD23F';
  return `<svg class="medal" viewBox="0 0 64 64" aria-hidden="true">
  <path d="M20 4h10l-4 18h-10zM34 4h10l2 18H38z" fill="#3346FF" stroke="#15131F" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M32 18l5 3.5 6-.4 2.5 5.5 5 3.4-1 6 3 5.2-4 4.5-.3 6-5.8 1.7L39 58l-6-1.5L27 58l-3.6-4.6-5.8-1.7-.3-6-4-4.5 3-5.2-1-6 5-3.4L19 21.1l6 .4z" fill="${c}" stroke="#15131F" stroke-width="2.5" stroke-linejoin="round"/>
  <circle cx="32" cy="38" r="12" fill="#fff" stroke="#15131F" stroke-width="2.5"/>
  <g transform="translate(22 28) scale(.84)" fill="none" stroke="#15131F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${MEDAL_ICON[iconName] || MEDAL_ICON.star}</g></svg>`;
}

// ---------- covers ----------
function rng(seed) { let a = seed >>> 0 || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const PALETTES = [
  ['#3346FF', '#FFD23F', '#FF5DA2'], ['#22C79A', '#15131F', '#FFD23F'], ['#FF5A36', '#FFE9B8', '#15131F'],
  ['#8E6CF0', '#A6E22E', '#15131F'], ['#FFD23F', '#3346FF', '#FF5A36'], ['#4FC3F7', '#15131F', '#FF5DA2'],
  ['#FF5DA2', '#FFF4E0', '#3346FF'], ['#15131F', '#22C79A', '#FFD23F'],
];

export function cover(game, opts = {}) {
  if (BUILTIN_COVERS[game.slug]) return BUILTIN_COVERS[game.slug]();
  const r = rng((game.coverSeed || 1) + hash(game.title || ''));
  const [bg, fg, ac] = PALETTES[Math.floor(r() * PALETTES.length)];
  const pat = Math.floor(r() * 5), gid = id('cv');
  let deco = '';
  if (pat === 0) for (let i = 9; i > 0; i--) deco += `<circle cx="${70 + r() * 20}" cy="${120 + r() * 20}" r="${i * 26}" fill="${i % 2 ? fg : bg}" opacity="${i % 2 ? .9 : 1}"/>`;
  if (pat === 1) { deco = `<g transform="rotate(-24 160 120)">`; for (let i = -10; i < 20; i++) deco += `<rect x="${i * 24}" y="-120" width="12" height="480" fill="${fg}"/>`; deco += '</g>'; }
  if (pat === 2) for (let y = 12; y < 240; y += 24) for (let x = 12 + (y / 24 % 2) * 12; x < 320; x += 24) deco += `<circle cx="${x}" cy="${y}" r="${4 + r() * 5}" fill="${fg}"/>`;
  if (pat === 3) for (let y = 20; y < 260; y += 34) deco += `<path d="M-10 ${y} ${Array.from({ length: 12 }, (_, i) => `L${i * 30 + 5} ${y + (i % 2 ? -14 : 14)}`).join(' ')}" fill="none" stroke="${fg}" stroke-width="9" stroke-linejoin="round"/>`;
  if (pat === 4) for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, a2 = a + Math.PI / 18; deco += `<path d="M160 120L${160 + Math.cos(a) * 400} ${120 + Math.sin(a) * 400}L${160 + Math.cos(a2) * 400} ${120 + Math.sin(a2) * 400}z" fill="${fg}"/>`; }
  const cat = game.category || 'arcade';
  const blob = `<g transform="translate(${opts.small ? 104 : 96} ${52}) scale(${opts.small ? 5.4 : 5.4})"><circle cx="12" cy="12" r="11.5" fill="${ac}" stroke="#15131F" stroke-width=".6"/><g fill="none" stroke="#15131F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" transform="translate(4.8 4.8) scale(.6)">${P[cat] || P.arcade}</g></g>`;
  const initials = (game.title || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return `<svg viewBox="0 0 320 240" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(game.title || 'Game')} cover">
  <rect width="320" height="240" fill="${bg}"/>${deco}
  <g opacity=".95">${blob}</g>
  <text x="16" y="226" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="64" fill="${ac}" stroke="#15131F" stroke-width="3" paint-order="stroke" style="font-variation-settings:'wdth' 75">${esc(initials)}</text>
  </svg>`;
}
function hash(s) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); }

const BUILTIN_COVERS = {
  'gobble-grid': () => `<svg viewBox="0 0 320 240" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Gobble Grid cover">
  <rect width="320" height="240" fill="#120f26"/>
  <g fill="none" stroke="#ff6b4a" stroke-width="14" stroke-linecap="round" stroke-linejoin="round">
   <path d="M-10 30H90V70M130 30h60M230 30h100M40 110h50M230 110h50v40M130 110v40h60v-40M-10 190h60M100 190h120M270 190h60M40 150v40"/></g>
  <g fill="none" stroke="#ffa98f" stroke-width="3" stroke-linecap="round" opacity=".7"><path d="M-10 27H87M130 27h60M230 27h100"/></g>
  <g fill="#ffe7b0">${[...Array(13)].map((_, i) => `<ellipse cx="${18 + i * 24}" cy="70" rx="3.2" ry="4.4" transform="rotate(30 ${18 + i * 24} 70)"/>`).join('')}${[...Array(6)].map((_, i) => `<ellipse cx="${110 + i * 24}" cy="150" rx="3.2" ry="4.4"/>`).join('')}</g>
  <g transform="translate(96 152) rotate(-30)"><path d="M-6-14c22 0 22 22 2 36 6-16-10-24-10-32z" fill="#ff2e4d"/><rect x="-12" y="-20" width="12" height="8" fill="#7bd94a"/></g>
  <g transform="translate(205 70)"><circle r="40" fill="#13a88a" transform="translate(4 5)"/><circle r="40" fill="#2ee6c1"/>
   <ellipse cx="-14" cy="-20" rx="13" ry="7" fill="#fff" opacity=".35" transform="rotate(-30 -14 -20)"/>
   <ellipse cx="-2" cy="-8" rx="7" ry="10" fill="#1b1530"/><ellipse cx="22" cy="-8" rx="7" ry="10" fill="#1b1530"/><circle cx="1" cy="-12" r="2.6" fill="#fff"/><circle cx="25" cy="-12" r="2.6" fill="#fff"/>
   <ellipse cx="10" cy="17" rx="12" ry="8" fill="#1b1530"/>
   <path d="M0-40q0-14 8-18" stroke="#4c9d2b" stroke-width="5" fill="none"/><ellipse cx="14" cy="-56" rx="16" ry="7" fill="#7bd94a" transform="rotate(-30 14 -56)"/></g>
  <g transform="translate(62 192)"><path d="M0-34C9-20 30-10 29 6c0 15-14 22-29 22S-29 21-29 6C-30-10-9-20 0-34z" fill="#ff4f6d"/>
   <circle cy="2" r="13" fill="#fff"/><circle cx="5" cy="3" r="6.5" fill="#1b1530"/><path d="M-17-9 17-3v4l-34-6z" fill="#ff4f6d"/><path d="M-16-8 16-2" stroke="#1b1530" stroke-width="3.5" stroke-linecap="round"/></g>
  </svg>`,
  'bunker-blitz': () => `<svg viewBox="0 0 320 240" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Bunker Blitz cover">
  <rect width="320" height="240" fill="#0d1018"/>
  <path d="M0 0h320L215 85H105z" fill="#171a24"/><path d="M0 240h320L215 155H105z" fill="#262a33"/>
  <path d="M0 0l105 85v70L0 240z" fill="#2f5d73"/><path d="M320 0 215 85v70l105 85z" fill="#244a5c"/>
  <g stroke="#3c7590" stroke-width="3"><path d="M35 28v184M70 57v126M250 57v126M285 28v184"/></g>
  <rect x="105" y="85" width="110" height="70" fill="#ffc93c"/>
  <g fill="#1b1a20">${[...Array(8)].map((_, i) => `<path d="M${105 + i * 18} 85h9l-30 70h-9z"/>`).join('')}</g>
  <path d="M105 85h110v70H105z" fill="none" stroke="#0d1018" stroke-width="4"/>
  <g fill="#d9f7ff" opacity=".9"><rect x="140" y="10" width="40" height="6" rx="2"/><rect x="146" y="44" width="28" height="4" rx="2"/></g>
  <g transform="translate(160 118)"><rect x="-56" y="-6" width="18" height="12" fill="#1d2230"/><rect x="38" y="-6" width="18" height="12" fill="#1d2230"/>
   <circle r="40" fill="#8b93a8" stroke="#15131F" stroke-width="3"/><circle cx="-14" cy="-16" r="13" fill="#fff" opacity=".25"/>
   <circle cy="4" r="22" fill="#0b0d14"/><circle cy="4" r="13" fill="#ff3b3b"/><circle cx="-4" cy="0" r="4" fill="#fff"/>
   <path d="M0-40v-12" stroke="#1d2230" stroke-width="4"/><circle cy="-54" r="5" fill="#ff3b3b"/></g>
  <g stroke="#7ff2de" stroke-width="3" stroke-linecap="round" opacity=".9"><path d="M160 200v-10M160 222v10M138 211h10M172 211h10"/></g>
  <circle cx="160" cy="211" r="14" fill="none" stroke="#7ff2de" stroke-width="2.5" opacity=".9"/>
  </svg>`,
  'cave-hopper': () => `<svg viewBox="0 0 320 240" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Cave Hopper cover">
  <defs><linearGradient id="chs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b1650"/><stop offset=".55" stop-color="#7a2f63"/><stop offset="1" stop-color="#ff7a59"/></linearGradient></defs>
  <rect width="320" height="240" fill="url(#chs)"/>
  <circle cx="240" cy="160" r="46" fill="#ffc93c"/>
  <path d="M0 180q40-50 80-20t90-30 80 20 70-10v100H0z" fill="#5a2459"/>
  <path d="M0 205q50-40 100-10t100-20 120 10v55H0z" fill="#3e1a4a"/>
  <path d="M0 0h320v40q-20 20-40 8t-40 14-50-10-40 22-50-14-50 20-50-16z" fill="#1b0f2a"/>
  <path d="M0 40q30 14 50 0t50 16 50-14 40 22 50-10 40-14 40-8" fill="none" stroke="#ff5a36" stroke-width="4"/>
  <path d="M0 240v-30q30-14 60 0t60-12 50 10 60-16 50 12 40-4v40z" fill="#1b0f2a"/>
  <path d="M0 210q30-14 60 0t60-12 50 10 60-16 50 12 40-4" fill="none" stroke="#ffc93c" stroke-width="4"/>
  <rect x="196" y="40" width="22" height="64" rx="8" fill="#1b0f2a" stroke="#ff5a36" stroke-width="3"/>
  <g fill="#7ff2de"><path d="M250 112l8-12 8 12-8 12z"/><path d="M286 92l6-9 6 9-6 9z" opacity=".7"/></g>
  <g fill="rgba(255,233,180,.7)"><circle cx="70" cy="132" r="4"/><circle cx="56" cy="138" r="3"/><circle cx="44" cy="142" r="2.4"/></g>
  <g transform="translate(110 118) rotate(-14) scale(2.3)">
   <ellipse cx="-3" cy="-12" rx="10" ry="6" fill="#dcf5ff" opacity=".85" transform="rotate(-25 -3 -12)"/><ellipse cx="6" cy="-11" rx="8" ry="5" fill="#dcf5ff" opacity=".85" transform="rotate(20 6 -11)"/>
   <ellipse cx="1" cy="2" rx="15" ry="11" fill="#15131F"/><ellipse rx="14" ry="10" fill="#ffc93c"/>
   <path d="M-7-9.5v19M-3-10v20M1-10v20M5-9.5v19" stroke="#15131F" stroke-width="0"/>
   <rect x="-7" y="-10" width="4" height="20" fill="#15131F"/><rect x="1" y="-10" width="4" height="20" fill="#15131F"/>
   <circle cx="8" cy="-2" r="4.2" fill="#fff4e0"/><circle cx="9.3" cy="-2" r="2" fill="#15131F"/>
   <path d="M6-9q3-7 7-6" stroke="#15131F" stroke-width="2" fill="none"/></g>
  </svg>`,
  ...MORE_COVERS,
};

// ---------- illustrations for empty / loading states ----------
export const loadingArt = () => logo(70);
export function emptyArt() {
  return `<svg viewBox="0 0 160 120" aria-hidden="true"><ellipse cx="80" cy="108" rx="50" ry="6" fill="currentColor" opacity=".12"/>
  <g transform="translate(46 16)">${logo(68).replace('<svg ', '<svg x="0" y="0" ')}</g>
  <path d="M120 30q10-8 18 0M126 40q6-4 10 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".5"/></svg>`;
}
export { esc };
