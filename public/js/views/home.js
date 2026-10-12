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
      <h1>Snack-sized games, right in your browser.</h1>
      <p class="lede">Hit play and you're in. No installs. Sign in when you want your scores and XP to stick, and upload your own games to level up faster.</p>
      <div class="cta">
        ${first ? `<a class="btn primary big" href="/game/${esc(first.slug)}" id="hero-play">${icon('play')}Play ${esc(first.title)}</a>` : ''}
        <a class="btn big" href="/upload">${icon('upload')}Upload a game</a>
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

  ${d.popular.length ? `<section class="section"><div class="wrap">${sectionHead('Most played', 'What everyone keeps coming back to.', ['See all games', '/games?sort=popular'])}${shelf(d.popular.slice(0, 10), true)}</div></section>` : ''}

  <section class="section"><div class="wrap">${sectionHead('Made by players', 'Fresh uploads from the community. Play one and leave a like.', d.community.length ? ['All community games', '/games?source=community'] : null)}
    ${d.community.length ? shelf(d.community.slice(0, 10), true) : `<div class="panel" style="display:flex;gap:18px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:240px"><h3>No player games yet</h3><p class="muted">Be the first. Drop in a zip, a single HTML file, a GitHub repo or a Unity WebGL build.</p></div><a class="btn lemon" href="/upload">${icon('upload')}Upload the first one</a></div>`}
  </div></section>

  ${d.fresh.length > 3 ? `<section class="section"><div class="wrap">${sectionHead('Fresh drops', 'Newest on the shelf.', ['Browse newest', '/games?sort=new'])}${shelf(d.fresh.slice(0, 10), true)}</div></section>` : ''}
  ${d.loved.length > 2 ? `<section class="section"><div class="wrap">${sectionHead('Most liked', null, ['Browse most liked', '/games?sort=loved'])}${shelf(d.loved, true)}</div></section>` : ''}

  <section class="maker-band"><div class="wrap">
    <div><h2>Make a game, level up.</h2>
      <p>Publishing a game earns ${state.meta.rules.upload.xp} XP on the spot. Every new player who tries it and every like it collects earns you more, and badges stack up on your profile.</p>
      <a class="btn lemon big" href="/upload">${icon('upload')}Upload your game</a></div>
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
  return `${coverHtml(g)}<div class="play-overlay"><div class="title-plate"><h2>${esc(g.title)}</h2><p>${g.author ? 'by ' + esc(g.author.displayName) : 'Snackade original'}, ${compact(g.plays)} plays</p></div>
    <span class="btn primary">${icon('play')}<span>Play</span></span></div>`;
}
export { cart };
