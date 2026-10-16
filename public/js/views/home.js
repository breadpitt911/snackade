import { api, state, esc, icon, fmt, compact, title, go } from '../core.js';
import { cart, shelf, catChip, sectionHead, coverHtml } from '../components.js';
import { bite, medal } from '../art.js';

export async function render(root) {
  const d = await api('/home');
  title('');
  const machine = (d.machine || d.popular).slice(0, 8);
  const levels = state.meta.levels.filter(l => [2, 5, 10, 21].includes(l.level));
  const cats = state.meta.categories;

  root.innerHTML = `
  <section class="vend-wrap"><div class="wrap">
    <div class="vend">
      <div class="vend-sign">
        <h1>Free browser games. Pick one and play.</h1>
        <p>No downloads, no sign-up needed. Everything runs right here, on your phone or your laptop.</p>
      </div>
      <div class="vend-glass" id="glass">${machine.map((g, i) => slotHtml(g, i)).join('')}</div>
      <div class="vend-panel">
        <div class="lcd" id="lcd" aria-hidden="true">${lcdHtml(machine[0], 0)}</div>
        ${machine[0] ? `<a class="btn lemon big vend-play" id="vend-play" href="/game/${esc(machine[0].slug)}" aria-label="Play ${esc(machine[0].title)}">${icon('play')}<span>Play ${CODES[0]}</span></a>` : ''}
        <button class="btn big vend-surprise" id="surprise" type="button">${icon('shuffle')}Surprise me</button>
        <div class="keypad" role="group" aria-label="Choose a slot">${machine.map((g, i) => `<button type="button" data-k="${i}" aria-label="Choose ${esc(g.title)}" aria-pressed="${i === 0}">${CODES[i]}</button>`).join('')}</div>
        <a class="vend-all" href="/games">See all ${fmt(d.stats.games)} games</a>
      </div>
      <div class="vend-tray" id="tray" aria-hidden="true"><span>Your game drops here</span></div>
    </div>
  </div></section>

  <section class="section"><div class="wrap">
    <div class="cats">${cats.map(c => catChip(c, { count: d.categories[c] || 0 })).join('')}</div>
  </div></section>

  ${fameBand(d)}

  ${d.duos?.length ? `<section class="section"><div class="wrap">${sectionHead('Two players, one keyboard', 'Grab whoever\'s next to you. Every one of these has a 2-player mode on the same screen.', ['See them all', '/games?q=2-player'])}${shelf(d.duos.slice(0, 10), true)}</div></section>` : ''}
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

  // ---------- vending machine ----------
  const lcd = root.querySelector('#lcd'), play = root.querySelector('#vend-play'), slots = [...root.querySelectorAll('.slot')];
  const show = i => {
    const g = machine[i]; if (!g) return;
    lcd.innerHTML = lcdHtml(g, i);
    if (play) { play.href = `/game/${g.slug}`; play.querySelector('span').textContent = `Play ${CODES[i]}`; play.setAttribute('aria-label', `Play ${g.title}`); }
  };
  const keys = [...root.querySelectorAll('.keypad button')];
  let chosen = 0;
  slots.forEach((el, i) => { el.addEventListener('mouseenter', () => show(i)); el.addEventListener('focus', () => show(i)); });
  root.querySelector('.vend-glass').addEventListener('mouseleave', () => show(chosen));
  // keypad: first press picks the slot, pressing the same key again plays it
  keys.forEach((k, i) => k.addEventListener('click', () => {
    if (chosen === i && k.getAttribute('aria-pressed') === 'true') return go(`/game/${machine[i].slug}`);
    chosen = i; show(i);
    keys.forEach(x => x.setAttribute('aria-pressed', String(x === k)));
    slots.forEach(x => x.classList.toggle('lit', x === slots[i]));
  }));
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.querySelector('#surprise').addEventListener('click', async e => {
    const btn = e.currentTarget; btn.disabled = true;
    let g;
    try { g = (await api('/random')).game; } catch { btn.disabled = false; return; }
    if (!g) { btn.disabled = false; return; }
    if (still) return go(`/game/${g.slug}`);
    // a quick roulette across the slots, then the pick drops into the tray
    const target = machine.findIndex(m => m.slug === g.slug);
    const visible = slots.filter(el => el.offsetParent);
    const steps = 12 + Math.floor(Math.random() * visible.length);
    for (let k = 0; k <= steps; k++) {
      const el = k === steps ? slots[target] : visible[k % visible.length];   // undefined if the pick isn't on display
      slots.forEach(x => x.classList.toggle('lit', x === el));
      if (k === steps && target >= 0) show(target);
      await new Promise(r => setTimeout(r, 45 + k * k * .9));
    }
    lcd.innerHTML = `<b class="code">OK</b><span class="t">${esc(g.title)}</span><span class="m">Coming right up</span>`;
    const tray = root.querySelector('#tray');
    tray.innerHTML = `<span class="drop">${coverHtml(g, { small: true })}</span>`;
    setTimeout(() => go(`/game/${g.slug}`), tray.offsetParent ? 700 : 250);
  });
}

const CODES = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4'];
const coil = `<svg class="coil" viewBox="0 0 120 10" preserveAspectRatio="none" aria-hidden="true"><path d="M0 5${Array.from({ length: 12 }, (_, i) => ` q5 ${i % 2 ? 5 : -5} 10 0`).join('')}"/></svg>`;
function slotHtml(g, i) {
  const duo = g.tags?.includes('2-player');
  return `<a class="slot" href="/game/${esc(g.slug)}" aria-label="Play ${esc(g.title)}">
    <span class="cov">${coverHtml(g, { small: true })}${duo ? '<span class="duo">2P</span>' : ''}</span>${coil}
    <span class="lab"><b class="code">${CODES[i]}</b><span>${esc(g.title)}</span></span></a>`;
}
function lcdHtml(g, i) {
  if (!g) return '<span class="t">Restocking</span><span class="m">Check back soon</span>';
  const cat = state.meta.categoryNoun?.[g.category] || g.category;
  return `<b class="code">${CODES[i]}</b><span class="t">${esc(g.title)}</span><span class="m">${esc(cat[0].toUpperCase() + cat.slice(1))}${g.tags?.includes('2-player') ? ', 1 or 2 players' : ''}</span>`;
}

// Game of the Month spotlight, or this month's race, or a nudge to start rating.
function fameBand(d) {
  const month = m => { const [y, mo] = m.split('-').map(Number); return new Date(Date.UTC(y, mo - 1, 1)).toLocaleString('en', { month: 'long', timeZone: 'UTC' }); };
  const bites = avg => `<span class="avg-bites">${[1, 2, 3, 4, 5].map(n => bite(avg >= n - .25, 16)).join('')}</span>`;
  if (d.gotm) {
    const g = d.gotm.game;
    return `<section class="section"><div class="wrap"><div class="gotm panel">
      <a class="thumb" href="/game/${esc(g.slug)}" tabindex="-1" aria-hidden="true">${coverHtml(g, { small: true })}</a>
      <div class="gotm-text"><span class="crown-tag">${medal('trophy')}Game of the Month · ${month(d.gotm.month)}</span>
        <h2><a href="/game/${esc(g.slug)}">${esc(g.title)}</a></h2>
        <p class="muted">${g.author ? `by ${esc(g.author.displayName)}, ` : ''}${bites(d.gotm.avg)} ${d.gotm.avg.toFixed(1)} from ${d.gotm.votes} ratings</p></div>
      <div class="gotm-cta"><a class="btn primary" href="/game/${esc(g.slug)}">${icon('play')}Play the winner</a><a class="btn ghost small" href="/hall-of-fame">See this month's race</a></div>
    </div></div></section>`;
  }
  if (d.race.length) return `<section class="section"><div class="wrap">${sectionHead('The race for Game of the Month', 'Top-rated this month. Play something, rate it, change the order.', ['Hall of Fame', '/hall-of-fame'])}
    <ol class="race-mini">${d.race.map((r, i) => `<li><span class="rk num">${i + 1}</span><a class="thumb" href="/game/${esc(r.game.slug)}" tabindex="-1" aria-hidden="true">${coverHtml(r.game, { small: true })}</a>
      <div><a href="/game/${esc(r.game.slug)}">${esc(r.game.title)}</a><small>${bites(r.avg)} ${r.avg.toFixed(1)}, ${r.votes} ratings</small></div></li>`).join('')}</ol></div></section>`;
  return '';
}

export { cart };
