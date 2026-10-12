import { api, state, esc, icon, fmt, compact, title } from '../core.js';
import { cart, shelf, catChip, sectionHead, coverHtml } from '../components.js';

export async function render(root) {
  const d = await api('/home');
  title('');
  const picks = (d.featured.length ? d.featured : d.popular).slice(0, 3);
  const first = picks[0];
  const levels = state.meta.levels.filter(l => [2, 5, 10, 21].includes(l.level));
  const cats = state.meta.categories;

  root.innerHTML = `
  <section class="hero"><div class="wrap">
    <div>
      <h1>Hit play. That's it, you're in.</h1>
      <p class="lede">Free games that run right in your browser. No downloads, no nonsense. Grab an account if you want your scores and XP to stick, and if you've made a game, throw it up here.</p>
      <div class="cta">
        ${first ? `<a class="btn primary big" href="/game/${esc(first.slug)}" id="hero-play">${icon('play')}Play ${esc(first.title)}</a>` : ''}
        <a class="btn big" href="/upload">${icon('upload')}Upload your game</a>
      </div>
      <div class="facts"><div><b class="num">${fmt(d.stats.games)}</b>games</div><div><b class="num">${compact(d.stats.plays)}</b>plays</div><div><b class="num">${fmt(d.stats.players)}</b>players</div></div>
    </div>
    ${first ? `<div class="cabinet">
      <a class="screen" id="screen" href="/game/${esc(first.slug)}">${screenInner(first)}</a>
      ${picks.length > 1 ? `<div class="picks" role="group" aria-label="Featured games">${picks.map((g, i) => `<button type="button" data-i="${i}" aria-pressed="${i === 0}"><span class="thumb">${coverHtml(g, { small: true })}</span><span>${esc(g.title)}</span></button>`).join('')}</div>` : ''}
    </div>` : ''}
  </div></section>

  <section class="section"><div class="wrap">
    <div class="cats">${cats.map(c => catChip(c, { count: d.categories[c] || 0 })).join('')}</div>
  </div></section>

  ${d.popular.length ? `<section class="section"><div class="wrap">${sectionHead('Most played', 'The ones people can\'t put down.', ['See all games', '/games?sort=popular'])}${shelf(d.popular.slice(0, 10), true)}</div></section>` : ''}

  <section class="section"><div class="wrap">${sectionHead('Made by players', 'Built by people on here. Give one a go and drop a like, it goes a long way.', d.community.length ? ['All community games', '/games?source=community'] : null)}
    ${d.community.length ? shelf(d.community.slice(0, 10), true) : `<div class="panel" style="display:flex;gap:18px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:240px"><h3>Nobody's uploaded anything yet</h3><p class="muted">The shelf's all yours. A zip, one HTML file, a GitHub repo or a Unity build all work.</p></div><a class="btn lemon" href="/upload">${icon('upload')}Be the first</a></div>`}
  </div></section>

  ${d.fresh.length > 3 ? `<section class="section"><div class="wrap">${sectionHead('Just landed', 'Newest stuff on the shelf.', ['See everything new', '/games?sort=new'])}${shelf(d.fresh.slice(0, 10), true)}</div></section>` : ''}
  ${d.loved.length > 2 ? `<section class="section"><div class="wrap">${sectionHead('Most liked', 'People really dig these.', ['See all the favourites', '/games?sort=loved'])}${shelf(d.loved, true)}</div></section>` : ''}

  <section class="maker-band"><div class="wrap">
    <div><h2>Made a game? Get it out there.</h2>
      <p>You get ${state.meta.rules.upload.xp} XP the second it goes live. After that, every new player and every like keeps the XP rolling in, and the badges start stacking up on your profile.</p>
      <a class="btn lemon big" href="/upload">${icon('upload')}Upload it</a></div>
    <div class="ladder" aria-label="Levels">${levels.map(l => `<div class="rung"><span class="lvl">Lv ${l.level}</span><b>${esc(l.title)}</b><span class="xp num">${fmt(l.xp)} XP</span></div>`).join('')}</div>
  </div></section>`;

  const screen = root.querySelector('#screen'), heroPlay = root.querySelector('#hero-play');
  root.querySelectorAll('.picks button').forEach(b => b.addEventListener('click', () => {
    const g = picks[+b.dataset.i];
    screen.href = `/game/${g.slug}`; screen.innerHTML = screenInner(g);
    if (heroPlay) { heroPlay.href = `/game/${g.slug}`; heroPlay.innerHTML = `${icon('play')}Play ${esc(g.title)}`; }
    root.querySelectorAll('.picks button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  }));
}

function screenInner(g) {
  return `${coverHtml(g)}<div class="play-overlay"><div class="title-plate"><h2>${esc(g.title)}</h2><p>${g.author ? 'by ' + esc(g.author.displayName) : 'Snackade original'}, ${compact(g.plays)} ${g.plays === 1 ? 'play' : 'plays'}</p></div>
    <span class="btn primary">${icon('play')}<span>Play</span></span></div>`;
}
export { cart };
