import { api, state, esc, go, title } from '../core.js';
import { cart, catChip } from '../components.js';
import { emptyArt, CAT_NAMES } from '../art.js';

const SORTS = [['new', 'Newest'], ['popular', 'Most played'], ['loved', 'Most liked'], ['az', 'A–Z']];
const SOURCES = [['', 'Everything'], ['staff', 'Originals'], ['community', 'Community']];

export async function render(root, _p, qs) {
  const q = qs.get('q') || '', category = qs.get('category') || '', sort = qs.get('sort') || 'new', source = qs.get('source') || '';
  const params = new URLSearchParams({ sort, limit: 36 });
  if (q) params.set('q', q); if (category) params.set('category', category); if (source) params.set('source', source);
  const d = await api('/games?' + params);
  const heading = q ? `Games matching “${esc(q)}”` : category ? CAT_NAMES[category] || category : 'All games';
  title(q ? `Search: ${q}` : category ? CAT_NAMES[category] : 'All games');

  root.innerHTML = `<div class="wrap">
    <div class="page-head"><h1 style="font-size:clamp(2rem,4vw,3.2rem)">${heading}</h1>
      <p>${d.total} ${d.total === 1 ? 'game' : 'games'}${q ? '' : ', all free and playable right here'}.</p></div>
    <div class="cats" style="margin-bottom:18px">
      <a class="chip ${!category ? 'on' : ''}" href="${link({ category: '' })}" style="padding-left:14px">Everything</a>
      ${state.meta.categories.map(c => catChip(c, { on: c === category }).replace(`href="/games?category=${c}"`, `href="${link({ category: c })}"`)).join('')}
    </div>
    <div class="filters">
      <div class="seg" role="group" aria-label="Sort">${SORTS.map(([k, l]) => `<button data-sort="${k}" aria-pressed="${k === sort}">${l}</button>`).join('')}</div>
      <div class="seg" role="group" aria-label="Made by">${SOURCES.map(([k, l]) => `<button data-source="${k}" aria-pressed="${k === source}">${l}</button>`).join('')}</div>
    </div>
    <div id="results">${d.games.length ? `<div class="shelf" id="grid">${d.games.map(cart).join('')}</div>` : empty(q)}</div>
    ${d.total > d.games.length ? `<div style="text-align:center;margin:30px 0"><button class="btn" id="more">Load more</button></div>` : ''}
  </div>`;

  function link(over) {
    const u = new URLSearchParams({ q, category, sort, source, ...over });
    for (const [k, v] of [...u]) if (!v || (k === 'sort' && v === 'new')) u.delete(k);
    const s = u.toString(); return '/games' + (s ? '?' + s : '');
  }
  root.querySelectorAll('[data-sort]').forEach(b => b.addEventListener('click', () => go(link({ sort: b.dataset.sort }), { replace: true })));
  root.querySelectorAll('[data-source]').forEach(b => b.addEventListener('click', () => go(link({ source: b.dataset.source }), { replace: true })));
  let offset = d.games.length;
  root.querySelector('#more')?.addEventListener('click', async e => {
    e.target.disabled = true;
    params.set('offset', offset);
    const more = await api('/games?' + params);
    root.querySelector('#grid').insertAdjacentHTML('beforeend', more.games.map(cart).join(''));
    offset += more.games.length;
    if (offset >= more.total) e.target.remove(); else e.target.disabled = false;
  });
}

function empty(q) {
  return `<div class="empty">${emptyArt()}<h2>${q ? 'No games match that' : 'Nothing here yet'}</h2>
  <p class="muted">${q ? 'Try a shorter search, or pick a category above.' : 'This shelf is empty. Upload a game and it will show up here.'}</p>
  <a class="btn lemon" href="/upload">Upload a game</a></div>`;
}
