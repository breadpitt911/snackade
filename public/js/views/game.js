import { api, apiUpload, state, esc, icon, fmt, compact, ago, avatarHtml, toast, toastError, modal, go, requireLogin, title } from '../core.js';
import { shelf, catChip, coverHtml } from '../components.js';
import { CAT_NAMES } from '../art.js';

const KIND_LABEL = { builtin: 'Snackbar original', html: 'Single HTML file', html5: 'HTML5 game', github: 'Straight from GitHub', unity: 'Unity WebGL', embed: 'Hosted elsewhere' };

export async function render(root, [slug]) {
  let d = await api('/games/' + slug);
  const g = d.game;
  title(`${g.title} · Play free online`);
  const [aw, ah] = g.aspect.split(':').map(Number);
  let iframe = null, scoreQueue = Promise.resolve();

  root.innerHTML = `<div class="wrap"><div class="game-layout">
    <div>
      <div class="player" id="player">
        <div class="stage" style="--ar:${aw} / ${ah}">
          <button class="poster" id="poster" aria-label="Play ${esc(g.title)}">${coverHtml(g)}
            <span class="go"><span class="disc">${icon('play')}</span><b>Play ${esc(g.title)}</b></span></button>
        </div>
        <div class="player-bar">
          <button class="btn small" id="like" aria-pressed="${d.liked}">${icon(d.liked ? 'heartFill' : 'heart')}<span id="like-n" class="num">${fmt(g.likes)}</span></button>
          <span class="muted num" style="display:inline-flex;gap:4px;align-items:center">${icon('plays', 16)}<span id="plays-n">${fmt(g.plays)}</span> <span id="plays-w">${g.plays === 1 ? 'play' : 'plays'}</span></span>
          <span class="spacer"></span>
          <button class="btn small ghost" id="restart" title="Restart" disabled>${icon('restart')}<span class="sr">Restart</span></button>
          <button class="btn small ghost" id="theatre" title="Wide view" aria-pressed="false">${icon('theatre')}<span class="sr">Wide view</span></button>
          <button class="btn small" id="fs">${icon('expand')}Go full screen</button>
        </div>
      </div>
      <div class="game-info">
        <div class="title-row">
          <div><h1 style="font-size:clamp(2rem,4vw,3rem)">${esc(g.title)}</h1>
            <div class="byline">${g.author ? `<span class="av">${avatarHtml(g.author)}</span><span>by <a href="/u/${esc(g.author.username)}">${esc(g.author.displayName)}</a></span>` : `<span>A Snackbar original</span>`}
              ${g.kind !== 'builtin' ? `<span class="muted">${esc(KIND_LABEL[g.kind] || '')}, added ${ago(g.createdAt)}</span>` : ''}</div></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">${catChip(g.category)}
            ${d.canEdit ? `<button class="btn small" id="edit">${icon('edit')}Edit</button>` : ''}</div>
        </div>
        ${g.status === 'hidden' ? '<div class="err">This one\'s hidden. Only you and the admins can see it right now.</div>' : ''}
        ${g.description ? `<p class="desc">${esc(g.description)}</p>` : ''}
        ${g.instructions ? `<div class="howto"><h3>How to play</h3><p>${esc(g.instructions)}</p></div>` : ''}
        ${g.tags.length ? `<div class="tags">${g.tags.map(t => `<a href="/games?q=${encodeURIComponent(t)}">#${esc(t)}</a>`).join('')}</div>` : ''}
        ${g.sourceUrl ? `<p class="muted" style="display:flex;gap:6px;align-items:center">${icon(g.kind === 'github' ? 'github' : 'link', 16)}<a href="${esc(g.sourceUrl)}" target="_blank" rel="noopener noreferrer">${g.kind === 'github' ? 'View source on GitHub' : 'Original site'}</a></p>` : ''}
      </div>
    </div>
    <aside class="side">
      <div class="panel board" id="board">${boardHtml(d)}</div>
      ${state.me ? '' : `<div class="panel"><h3>Heads up, you're not signed in</h3><p class="muted" style="margin:6px 0 14px">Play all you want, but your scores and XP won't save. Sign up takes about ten seconds and you get ${state.meta.rules.play.xp} XP for every game you play.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn primary small" href="/signup?next=/game/${esc(g.slug)}">Sign up</a><a class="btn small" href="/login?next=/game/${esc(g.slug)}">I've got an account</a></div></div>`}
    </aside>
  </div>
  ${d.related.length ? `<section class="section" style="padding-top:0"><h2 style="margin-bottom:16px">More ${esc((CAT_NAMES[g.category] || '').toLowerCase())} like this</h2>${shelf(d.related, true)}</section>` : ''}
  ${d.more.length ? `<section class="section"><h2 style="margin-bottom:16px">Or try something different</h2>${shelf(d.more, true)}</section>` : ''}
  </div>`;

  const stage = root.querySelector('.stage'), player = root.querySelector('#player');
  function start() {
    if (iframe) return;
    iframe = document.createElement('iframe');
    iframe.src = g.playUrl;
    iframe.title = g.title;
    // Games run on a separate origin, so allow-same-origin only gives them their own storage, never ours.
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-pointer-lock allow-popups allow-forms allow-modals allow-downloads');
    iframe.setAttribute('allow', 'autoplay; fullscreen; gamepad; clipboard-write; accelerometer; gyroscope');
    iframe.setAttribute('allowfullscreen', '');
    root.querySelector('#poster').replaceWith(iframe);
    iframe.focus();
    root.querySelector('#restart').disabled = false;
    api(`/games/${g.slug}/play`, { method: 'POST' }).then(r => { root.querySelector('#plays-n').textContent = fmt(r.plays); root.querySelector('#plays-w').textContent = r.plays === 1 ? 'play' : 'plays'; }).catch(() => {});
  }
  root.querySelector('#poster').addEventListener('click', start);
  root.querySelector('#restart').addEventListener('click', () => { if (iframe) { iframe.src = g.playUrl; iframe.focus(); } });
  root.querySelector('#fs').addEventListener('click', () => {
    start();
    const el = stage;
    (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
    setTimeout(() => iframe?.focus(), 100);
  });
  root.querySelector('#theatre').addEventListener('click', e => {
    const on = !player.classList.contains('theatre');
    player.classList.toggle('theatre', on);
    e.currentTarget.setAttribute('aria-pressed', on);
    const layout = root.querySelector('.game-layout');
    layout.style.gridTemplateColumns = on ? '1fr' : '';
  });

  root.querySelector('#like').addEventListener('click', async e => {
    if (!state.me) return requireLogin('Sign in to like games, it\'s quick.');
    const btn = e.currentTarget;
    try {
      const r = await api(`/games/${g.slug}/like`, { method: 'POST' });
      btn.setAttribute('aria-pressed', r.liked);
      btn.classList.toggle('liked', r.liked);
      btn.innerHTML = `${icon(r.liked ? 'heartFill' : 'heart')}<span class="num">${fmt(r.likes)}</span>`;
    } catch (err) { toastError(err.message); }
  });
  if (d.liked) root.querySelector('#like').classList.add('liked');

  // Messages from the game (via the Snackbar SDK)
  let guestNoted = false;
  function onMessage(e) {
    if (!iframe || e.source !== iframe.contentWindow || e.origin !== g.playOrigin) return;
    const m = e.data;
    if (!m || m.source !== 'snackbar') return;
    if (m.type === 'score' && Number.isFinite(m.score)) {
      if (!state.me) {
        if (!guestNoted && m.score > 0) { guestNoted = true; toast(`Nice, ${fmt(m.score)}! <a href="/signup?next=/game/${esc(g.slug)}">Sign up</a> and it'll actually count next time.`, { pip: '🎯', ms: 6000 }); }
        return;
      }
      scoreQueue = scoreQueue.then(() => api(`/games/${g.slug}/score`, { method: 'POST', body: { score: m.score } }).then(r => {
        d.leaderboard = r.leaderboard; d.myBest = r.best;
        root.querySelector('#board').innerHTML = boardHtml(d);
        if (r.top) toast(`You're #1 on ${esc(g.title)} now. Big moves.`, { pip: '👑' });
        else if (r.personalBest) toast(`New personal best: ${fmt(m.score)}. Let's go.`, { pip: '🎯' });
      }).catch(err => toastError(err.message)));
    }
  }
  addEventListener('message', onMessage);
  const onVis = () => { if (document.hidden && iframe) iframe.contentWindow?.postMessage({ source: 'snackbar-site', type: 'pause' }, g.playOrigin); };
  document.addEventListener('visibilitychange', onVis);

  root.querySelector('#edit')?.addEventListener('click', () => editModal(g));

  return () => { removeEventListener('message', onMessage); document.removeEventListener('visibilitychange', onVis); };
}

function boardHtml(d) {
  const rows = d.leaderboard;
  return `<h3 style="display:flex;gap:8px;align-items:center">${icon('trophy', 20)}Leaderboard</h3>
  ${rows.length ? `<ol>${rows.map((r, i) => `<li><span class="rk">${i + 1}</span><span class="av">${avatarHtml(r.user)}</span><a href="/u/${esc(r.user.username)}">${esc(r.user.displayName)}</a><b>${fmt(r.score)}</b></li>`).join('')}</ol>`
    : `<p class="muted" style="margin-top:8px">Nobody's on the board yet. Finish a run while signed in and the top spot's yours.</p>`}
  ${d.myBest != null ? `<p class="mine">Your best: <b class="num">${fmt(d.myBest)}</b></p>` : ''}`;
}

function editModal(g) {
  const cats = state.meta.categories;
  const close = modal(`<form id="edit-form" class="form-grid" style="text-align:left;width:100%">
    <h2>Edit your game</h2>
    <div class="field"><label for="e-title">Title</label><input id="e-title" name="title" value="${esc(g.title)}" maxlength="60" required></div>
    <div class="field"><label for="e-desc">Description</label><textarea id="e-desc" name="description" maxlength="1200">${esc(g.description)}</textarea></div>
    <div class="field"><label for="e-ins">How to play</label><textarea id="e-ins" name="instructions" maxlength="600" style="min-height:70px">${esc(g.instructions)}</textarea></div>
    <div class="two"><div class="field"><label for="e-cat">Category</label><select id="e-cat" name="category">${cats.map(c => `<option value="${c}" ${c === g.category ? 'selected' : ''}>${CAT_NAMES[c]}</option>`).join('')}</select></div>
      <div class="field"><label for="e-ar">Shape</label><select id="e-ar" name="aspect">${['16:9', '4:3', '1:1', '3:4', '9:16'].map(a => `<option ${a === g.aspect ? 'selected' : ''}>${a}</option>`).join('')}</select></div></div>
    <div class="field"><label for="e-tags">Tags</label><input id="e-tags" name="tags" value="${esc(g.tags.join(', '))}" placeholder="retro, puzzle, two-player"></div>
    ${g.kind !== 'builtin' ? `<div class="field"><label for="e-cover">Swap the cover image</label><input id="e-cover" name="cover" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></div>` : ''}
    <div class="two"><div class="field"><label for="e-status">Visibility</label><select id="e-status" name="status"><option value="live" ${g.status === 'live' ? 'selected' : ''}>Live, anyone can play</option><option value="hidden" ${g.status === 'hidden' ? 'selected' : ''}>Hidden, just you</option></select></div>
      ${state.me?.isAdmin ? `<div class="field"><label for="e-feat">Feature on the home page</label><select id="e-feat" name="featured"><option value="0">No</option><option value="1" ${g.featured ? 'selected' : ''}>Yes</option></select></div>` : ''}</div>
    <div id="e-err"></div>
    <div style="display:flex;gap:10px;justify-content:space-between;flex-wrap:wrap">
      ${g.kind !== 'builtin' ? `<button type="button" class="btn ghost" id="e-del">${icon('trash')}Delete game</button>` : '<span></span>'}
      <div style="display:flex;gap:10px"><button type="button" class="btn" data-close>Cancel</button><button class="btn primary">Save changes</button></div></div>
  </form>`);
  const form = document.getElementById('edit-form');
  form.closest('.modal').style.maxWidth = '620px';
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(form);
    if (!fd.get('cover')?.size) fd.delete('cover');
    try {
      await new Promise((res, rej) => {
        const x = new XMLHttpRequest(); x.open('PATCH', `/api/games/${g.slug}`); x.setRequestHeader('x-snackbar', '1');
        x.onload = () => x.status < 400 ? res() : rej(new Error(JSON.parse(x.responseText || '{}').error || 'Save failed'));
        x.onerror = () => rej(new Error('Network error')); x.send(fd);
      });
      close(); toast('Saved. Looking good.', { pip: '✓' }); go(`/game/${g.slug}`, { replace: true });
    } catch (err) { document.getElementById('e-err').innerHTML = `<div class="err">${esc(err.message)}</div>`; }
  });
  document.getElementById('e-del')?.addEventListener('click', async () => {
    if (!confirm(`Delete "${g.title}" for good? All its plays, likes and scores go with it, and there's no undo.`)) return;
    try { await api(`/games/${g.slug}`, { method: 'DELETE' }); close(); toast('Game deleted.', { pip: '✓' }); go('/'); }
    catch (err) { toastError(err.message); }
  });
}
export { apiUpload };
