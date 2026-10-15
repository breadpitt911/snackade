import { api, state, esc, ago, fmt, compact, toast, toastError, title, requireLogin, avatarHtml, go, icon } from '../core.js';

export const adminTabs = (active, open) => `<nav class="admin-tabs" aria-label="Admin">
  ${[['overview', '/admin', 'Overview'], ['games', '/admin/games', 'Games'], ['players', '/admin/players', 'Players'], ['reports', '/admin/reports', 'Reports']]
    .map(([k, href, label]) => `<a href="${href}" ${k === active ? 'aria-current="page"' : ''}>${label}${k === 'reports' && open ? ` <span class="count">${open}</span>` : ''}</a>`).join('')}
</nav>`;

const mb = n => n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n ? `${Math.max(1, Math.round(n / 1024))} KB` : '–';

export async function render(root, [tab = 'overview'], qs) {
  if (!state.me) return requireLogin('Sign in as an admin.');
  if (!state.me.isAdmin) { const e = new Error('Nothing on this shelf.'); e.status = 404; throw e; }
  title({ overview: 'Admin', games: 'Admin: games', players: 'Admin: players' }[tab]);
  if (tab === 'games') return games(root, qs);
  if (tab === 'players') return players(root, qs);
  return overview(root);
}

// ---------- overview ----------
function bars(series, label) {
  const max = Math.max(1, ...series.map(s => s.n)), w = 14, gap = 4, h = 60;
  const total = series.reduce((a, s) => a + s.n, 0);
  return `<figure class="mini-chart"><figcaption><b>${label}</b><span class="muted num">${fmt(total)} in 14 days</span></figcaption>
    <svg viewBox="0 0 ${series.length * (w + gap)} ${h}" preserveAspectRatio="none" role="img" aria-label="${label}, last 14 days">
    ${series.map((s, i) => { const bh = Math.max(2, Math.round(s.n / max * (h - 4))); return `<rect x="${i * (w + gap)}" y="${h - bh}" width="${w}" height="${bh}" rx="3" style="--i:${i}"><title>${s.d}: ${s.n}</title></rect>`; }).join('')}
    </svg></figure>`;
}

async function overview(root) {
  const d = await api('/admin/overview');
  const s = d.stats;
  const tiles = [
    ['Players', s.players, `+${fmt(s.newPlayers)} this week`], ['Live games', s.liveGames, `+${fmt(s.newGames)} uploaded this week`],
    ['Plays today', s.playsToday, `${fmt(s.playsWeek)} this week`], ['Comments', s.commentsWeek, 'this week'],
    ['Ratings', s.ratingsWeek, 'this week'], ['Open reports', d.openReports, d.openReports ? 'need a look' : 'all clear', d.openReports ? '/admin/reports' : null],
    ['Taken down', s.takenDown, 'games', '/admin/games?filter=down'], ['Banned', s.banned, 'players', '/admin/players?filter=banned'],
  ];
  root.innerHTML = `<div class="wrap admin">${adminTabs('overview', d.openReports)}
    <div class="page-head"><h1 style="font-size:clamp(2rem,4vw,3rem)">Control room</h1><p>How the site's doing, and the stuff that needs you.</p></div>
    <div class="tiles">${tiles.map(([k, v, sub, href], i) => `<${href ? `a href="${href}"` : 'div'} class="tile${k === 'Open reports' && v ? ' hot' : ''}" style="--i:${i}">
      <small>${k}</small><b class="num">${compact(v)}</b><span class="muted">${sub}</span></${href ? 'a' : 'div'}>`).join('')}</div>
    <div class="charts panel">${bars(d.charts.plays, 'Plays')}${bars(d.charts.signups, 'New players')}${bars(d.charts.uploads, 'Uploads')}</div>
    <div class="admin-cols">
      <section class="panel"><h2>Automatic upload checks</h2>
        <ul class="checks">
          <li class="on"><span>Local scan for miners, password prompts and page hijacks</span></li>
          <li class="${d.scanner.google ? 'on' : 'off'}"><span>Google malware and phishing check ${d.scanner.google ? '' : '<span class="muted">(off: add <code>SAFE_BROWSING_KEY</code> to the server env)</span>'}</span></li>
        </ul>
        <p class="muted small">Every upload is checked in the background. Anything suspicious lands in Reports; miners and Google-listed sites are taken down straight away.</p></section>
      <section class="panel"><h2>Recent admin actions</h2>
        ${d.log.length ? `<ul class="alog">${d.log.map(l => `<li><b>@${esc(l.username || 'deleted')}</b> ${esc(l.action)} <span>${esc(l.target)}</span><time class="muted">${ago(l.created_at)}</time></li>`).join('')}</ul>` : '<p class="muted">Nothing yet.</p>'}</section>
    </div><div style="height:50px"></div></div>`;
}

// ---------- shared list page ----------
function listPage(root, { tab, head, intro, filters, placeholder, fetchPath, row, act, qs, sorts }) {
  const q = qs.get('q') || '', filter = qs.get('filter') || '', sort = qs.get('sort') || '';
  const url = over => { const u = new URLSearchParams({ q, filter, sort, ...over }); for (const [k, v] of [...u]) if (!v) u.delete(k); return `/admin/${tab}${u.size ? '?' + u : ''}`; };
  root.innerHTML = `<div class="wrap admin">${adminTabs(tab, state.me.openReports)}
    <div class="page-head"><h1 style="font-size:clamp(2rem,4vw,3rem)">${head}</h1><p>${intro}</p></div>
    <div class="filters">
      <form class="search admin-search" role="search">${icon('search')}<input name="q" type="search" placeholder="${placeholder}" aria-label="${placeholder}" value="${esc(q)}"></form>
      <div class="seg" role="group" aria-label="Filter">${filters.map(([k, l]) => `<button data-f="${k}" aria-pressed="${k === filter}">${l}</button>`).join('')}</div>
      ${sorts ? `<div class="seg" role="group" aria-label="Sort">${sorts.map(([k, l]) => `<button data-s="${k}" aria-pressed="${k === sort}">${l}</button>`).join('')}</div>` : ''}
    </div>
    <p class="muted small" id="count"></p>
    <ul class="alist" id="list"><li class="sk-row"></li><li class="sk-row"></li><li class="sk-row"></li></ul>
    <div style="text-align:center;margin:20px 0 60px"><button class="btn" id="more" hidden>Show more</button></div></div>`;
  root.querySelector('.admin-search').addEventListener('submit', e => { e.preventDefault(); go(url({ q: e.target.q.value.trim() }), { replace: true }); });
  root.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => go(url({ filter: b.dataset.f }), { replace: true })));
  root.querySelectorAll('[data-s]').forEach(b => b.addEventListener('click', () => go(url({ sort: b.dataset.s }), { replace: true })));
  const list = root.querySelector('#list'), more = root.querySelector('#more');
  let offset = 0;
  async function load(reset) {
    if (reset) offset = 0;
    const p = new URLSearchParams({ q, filter, sort, offset });
    const d = await api(`${fetchPath}?${p}`);
    const items = d.games || d.users;
    const html = items.map(row).join('');
    if (reset) list.innerHTML = html || '<li class="muted" style="padding:20px 0">Nothing matches.</li>'; else list.insertAdjacentHTML('beforeend', html);
    offset += items.length;
    root.querySelector('#count').textContent = `${fmt(d.total)} total`;
    more.hidden = offset >= d.total;
  }
  more.addEventListener('click', () => load(false));
  list.addEventListener('click', async e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const li = btn.closest('[data-key]');
    const body = await act(btn.dataset.act, li.dataset.key, li);
    if (!body) return;
    li.querySelectorAll('button').forEach(b => b.disabled = true);
    try {
      const r = await api(`${fetchPath}/${encodeURIComponent(li.dataset.key)}`, { method: 'POST', body });
      toast(r.scan ? (r.scan.ok ? 'Scan came back clean.' : `Scan flagged it: ${r.scan.findings.join(', ')}`) : 'Done.', { pip: '✓' });
      load(true);
    } catch (err) { toastError(err.message); li.querySelectorAll('button').forEach(b => b.disabled = false); }
  });
  load(true).catch(err => { list.innerHTML = `<li class="err">${esc(err.message)}</li>`; });
}

function games(root, qs) {
  listPage(root, {
    tab: 'games', head: 'Games', qs, fetchPath: '/admin/games', placeholder: 'Search title, slug or maker',
    intro: 'Feature the good stuff, hide or take down the bad. Taken-down games stay hidden until an admin restores them.',
    filters: [['', 'All'], ['live', 'Live'], ['hidden', 'Hidden'], ['down', 'Taken down'], ['featured', 'Featured'], ['community', 'Player-made']],
    row: g => `<li class="arow" data-key="${esc(g.slug)}">
      <div class="amain"><a class="t" href="/game/${esc(g.slug)}">${esc(g.title)}</a>
        <span class="muted small">${g.author ? `by <a href="/u/${esc(g.author)}">@${esc(g.author)}</a>` : 'original'} · ${esc(g.kind)} · ${mb(g.sizeBytes)} · ${ago(g.createdAt)}</span>
        <span class="pills">${g.takenDown ? '<span class="pill bad">taken down</span>' : g.status === 'hidden' ? '<span class="pill">hidden</span>' : '<span class="pill ok">live</span>'}
          ${g.featured ? '<span class="pill">featured</span>' : ''}${g.reports ? `<a class="pill bad" href="/admin/reports">${g.reports} open ${g.reports === 1 ? 'report' : 'reports'}</a>` : ''}</span>
        ${g.hosts.length ? `<span class="muted small hosts" title="${esc(g.hosts.join(', '))}">Loads from ${g.hosts.slice(0, 4).map(esc).join(', ')}${g.hosts.length > 4 ? ` +${g.hosts.length - 4}` : ''}</span>` : ''}</div>
      <div class="astats num"><span><b>${compact(g.plays)}</b> plays</span><span><b>${g.rating ?? '–'}</b> score</span><span><b>${compact(g.comments)}</b> comments</span></div>
      <div class="racts">
        <button class="btn small" data-act="${g.featured ? 'unfeature' : 'feature'}">${g.featured ? 'Unfeature' : 'Feature'}</button>
        ${g.takenDown ? '<button class="btn small" data-act="restore">Restore</button>' : `<button class="btn small" data-act="${g.status === 'live' ? 'hide' : 'show'}">${g.status === 'live' ? 'Hide' : 'Show'}</button><button class="btn small danger" data-act="takedown">Take down</button>`}
        ${g.kind !== 'builtin' ? '<button class="btn small ghost" data-act="rescan">Rescan</button><button class="btn small ghost" data-act="delete">Delete</button>' : ''}
      </div></li>`,
    act: async (a, slug, li) => {
      const name = li.querySelector('.t').textContent;
      if (a === 'delete' && !confirm(`Delete "${name}" for good? Files, plays, ratings and comments all go. No undo.`)) return null;
      if (a === 'takedown' && !confirm(`Take down "${name}"? The maker won't be able to put it back live.`)) return null;
      return { action: a };
    },
  });
}

function players(root, qs) {
  listPage(root, {
    tab: 'players', head: 'Players', qs, fetchPath: '/admin/users', placeholder: 'Search username or name',
    intro: 'Bans sign the player out and block them from signing in. Admins can do everything you can, so pick them carefully.',
    filters: [['', 'All'], ['makers', 'Makers'], ['admins', 'Admins'], ['banned', 'Banned']],
    sorts: [['', 'Newest'], ['xp', 'Most XP']],
    row: u => `<li class="arow" data-key="${esc(u.username)}">
      <div class="amain user"><span class="av">${avatarHtml(u)}</span><div><a class="t" href="/u/${esc(u.username)}">${esc(u.displayName)}</a>
        <span class="muted small">@${esc(u.username)} · joined ${ago(u.createdAt)}${u.lastActive ? ` · last seen ${esc(u.lastActive)}` : ''}</span>
        <span class="pills">${u.isMe ? '<span class="pill ok">you</span>' : ''}${u.isAdmin ? '<span class="pill">admin</span>' : ''}${u.banned ? '<span class="pill bad">banned</span>' : ''}${u.reported ? `<span class="pill bad">reported ${u.reported}×</span>` : ''}</span></div></div>
      <div class="astats num"><span><b>${u.level}</b> level</span><span><b>${compact(u.xp)}</b> XP</span><span><b>${u.games}</b> games</span><span><b>${u.comments}</b> comments</span></div>
      ${u.isMe ? '<div class="racts"><a class="btn small ghost" href="/settings">Your settings</a></div>' : `<div class="racts">
        ${u.banned ? '<button class="btn small" data-act="unban">Unban</button>' : `<button class="btn small danger" data-act="ban">Ban</button>
          <button class="btn small" data-act="${u.isAdmin ? 'unadmin' : 'admin'}">${u.isAdmin ? 'Remove admin' : 'Make admin'}</button>`}
        <button class="btn small ghost" data-act="delete">Delete</button></div>`}</li>`,
    act: async (a, username) => {
      if (a === 'ban') {
        if (!confirm(`Ban @${username}? They'll be signed out and can't sign back in.`)) return null;
        return { action: a, hideGames: confirm(`Also take down all of @${username}'s games?\n\nOK = take them down, Cancel = leave them up.`) };
      }
      if (a === 'admin' && !confirm(`Make @${username} an admin? They'll be able to do everything you can.`)) return null;
      if (a === 'delete' && prompt(`This deletes @${username}, their games, comments and scores for good.\nType their username to confirm:`) !== username) return null;
      return { action: a };
    },
  });
}
