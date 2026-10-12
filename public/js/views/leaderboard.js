import { api, state, esc, fmt, avatarHtml, title } from '../core.js';

export async function render(root) {
  const d = await api('/leaderboard');
  title('Leaderboard');
  const R = state.meta.rules;
  const TABS = { allTime: ['All time', 'XP'], weekly: ['This week', 'XP this week'], creators: ['Top makers', 'plays'] };

  root.innerHTML = `<div class="wrap">
    <div class="page-head"><h1 style="font-size:clamp(2rem,4vw,3.2rem)">Leaderboard</h1><p>You earn XP for playing, scoring and making games. Here's who's grinding hardest.</p></div>
    <div class="lb-layout">
      <div>
        <div class="tabs" role="tablist">${Object.entries(TABS).map(([k, [l]], i) => `<button role="tab" data-tab="${k}" aria-selected="${i === 0}">${l}</button>`).join('')}</div>
        <div id="lb"></div>
      </div>
      <aside class="side" id="xp">
        <div class="panel"><h3>How you earn XP</h3>
          <div class="rules" style="margin-top:8px">${Object.values(R).map(r => `<div><span>${esc(r.label)}${r.note ? `<small>${esc(r.note)}</small>` : ''}</span><b>+${r.xp}</b></div>`).join('')}</div>
          <p class="muted" style="margin-top:12px;font-size:.9rem">XP is just bragging rights for now. We're tracking all of it though, so don't be surprised if it turns into something later.</p></div>
        <div class="panel"><h3>Levels</h3><div class="rules" style="margin-top:8px">${state.meta.levels.map(l => `<div><span>Level ${l.level} <small>${esc(l.title)}</small></span><b class="num">${fmt(l.xp)} XP</b></div>`).join('')}</div></div>
      </aside>
    </div></div>`;

  const show = (k) => {
    const rows = d[k], unit = TABS[k][1];
    const el = root.querySelector('#lb');
    if (!rows.length) { el.innerHTML = `<div class="empty"><h3>Nobody here yet</h3><p class="muted">${k === 'creators' ? 'Put a game up and the top spot\'s basically yours.' : 'Play something while signed in and you\'re on the board.'}</p><a class="btn lemon" href="${k === 'creators' ? '/upload' : '/games'}">${k === 'creators' ? 'Upload your game' : 'Find a game'}</a></div>`; return; }
    const top = rows.slice(0, 3), order = [top[1], top[0], top[2]];
    el.innerHTML = `${rows.length >= 3 ? `<div class="podium">${order.map((r, i) => `<a class="place" href="/u/${esc(r.user.username)}"><span class="av">${avatarHtml(r.user)}</span><b>${esc(r.user.displayName)}</b><span class="muted num">${fmt(r.value)} ${unit}</span><span class="block">${[2, 1, 3][i]}</span></a>`).join('')}</div>` : ''}
    <ol class="ranklist panel" style="padding:4px 10px">${rows.map((r, i) => `<li><span class="rk">${i + 1}</span><span class="av">${avatarHtml(r.user)}</span>
      <span><a href="/u/${esc(r.user.username)}">${esc(r.user.displayName)}</a><small>Level ${r.user.level}${r.games ? `, ${r.games} game${r.games > 1 ? 's' : ''}` : ''}</small></span><b>${fmt(r.value)} <span class="muted" style="font-weight:500">${unit}</span></b></li>`).join('')}</ol>`;
  };
  root.querySelectorAll('[role=tab]').forEach(t => t.addEventListener('click', () => {
    root.querySelectorAll('[role=tab]').forEach(x => x.setAttribute('aria-selected', String(x === t)));
    show(t.dataset.tab);
  }));
  show('allTime');
  if (location.hash === '#xp') setTimeout(() => root.querySelector('#xp').scrollIntoView({ behavior: 'smooth' }), 50);
}
