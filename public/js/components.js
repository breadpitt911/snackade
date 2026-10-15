import { esc, icon, cover, bite, CAT_COLORS, CAT_NAMES } from './art.js';
import { compact } from './core.js';

export function coverHtml(g, opts) {
  return g.cover ? `<img src="${esc(g.cover)}" alt="" loading="lazy">` : cover(g, opts);
}

export function cart(g) {
  const isNew = g.author && Date.now() - g.createdAt < 7 * 864e5;
  const by = g.author ? `by ${esc(g.author.displayName)}` : 'Snackbar original';
  return `<a class="cart" href="/game/${esc(g.slug)}">
    <div class="label">${coverHtml(g, { small: true })}${isNew ? '<span class="tag new">New</span>' : ''}${g.status === 'hidden' ? '<span class="tag">Hidden</span>' : ''}${g.tags?.includes('2-player') ? '<span class="tag duo" title="Has a 2-player mode">2P</span>' : ''}</div>
    <div class="meta"><h3>${esc(g.title)}</h3>
      <div class="by"><span>${by}</span><span class="stats">${g.rating ? `<i class="sscore" title="Snack Score ${g.rating.avg} from ${g.rating.count} ratings">${bite(true, 14)}${g.rating.avg.toFixed(1)}</i>` : ''}<i title="${g.plays} plays">${icon('plays')}${compact(g.plays)}</i><i title="${g.likes} likes">${icon('heart')}${compact(g.likes)}</i></span></div>
    </div><div class="grip" aria-hidden="true"></div></a>`;
}

export const shelf = (games, row = false) => `<div class="shelf ${row ? 'row' : ''}">${games.map(cart).join('')}</div>`;

export function catChip(cat, { count, on, asButton } = {}) {
  const inner = `<span class="dot" style="background:${CAT_COLORS[cat]}">${icon(cat)}</span>${CAT_NAMES[cat] || cat}${count != null ? ` <small>${count}</small>` : ''}`;
  return asButton
    ? `<button type="button" class="chip" data-cat="${cat}" aria-pressed="${on ? 'true' : 'false'}">${inner}</button>`
    : `<a class="chip ${on ? 'on' : ''}" href="/games/${cat}">${inner}</a>`;
}

export const sectionHead = (title, sub, link) => `<div class="section-head"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>${link ? `<a href="${link[1]}">${link[0]}</a>` : ''}</div>`;
