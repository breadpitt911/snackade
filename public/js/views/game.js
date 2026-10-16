import { api, apiUpload, state, esc, icon, fmt, compact, ago, avatarHtml, toast, toastError, modal, go, requireLogin, title } from '../core.js';
import { shelf, catChip, coverHtml } from '../components.js';
import { CAT_NAMES, bite } from '../art.js';
import { reportModal } from '../report.js';


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
        <button class="imm-exit" id="imm-exit" type="button" aria-label="Leave full screen">${icon('close')}</button>
        <div class="rotate" id="rotate" hidden><span class="phone" aria-hidden="true"></span>
          <b id="rotate-t"></b><p>It fits the screen better that way.</p><button class="btn small lemon" id="rotate-ok" type="button">Play anyway</button></div>
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
        ${g.takenDown ? `<div class="err">This game was taken down after a report and only you and the admins can see it. If you think that's a mistake, email ${esc(state.meta.contactEmail)} and tell us why.</div>` : g.status === 'hidden' ? '<div class="err">This one\'s hidden. Only you and the admins can see it right now.</div>' : ''}
        ${g.description ? `<p class="desc">${esc(g.description)}</p>` : ''}
        ${g.instructions ? `<div class="howto"><h3>How to play</h3><p>${esc(g.instructions)}</p></div>` : ''}
        ${g.tags.length ? `<div class="tags">${g.tags.map(t => `<a href="/games?q=${encodeURIComponent(t)}">#${esc(t)}</a>`).join('')}</div>` : ''}
        ${g.sourceUrl ? `<p class="muted" style="display:flex;gap:6px;align-items:center">${icon(g.kind === 'github' ? 'github' : 'link', 16)}<a href="${esc(g.sourceUrl)}" target="_blank" rel="noopener noreferrer">${g.kind === 'github' ? 'View source on GitHub' : 'Original site'}</a></p>` : ''}
        ${g.hosts?.length ? `<p class="muted small hosts-line" title="${esc(g.hosts.join(', '))}">${icon('link', 14)}Loads content from ${g.hosts.length > 3 ? `${g.hosts.slice(0, 3).map(esc).join(', ')} and ${g.hosts.length - 3} more` : g.hosts.map(esc).join(', ')}</p>` : ''}
        ${d.canEdit && !state.me?.isAdmin ? '' : `<p class="report-row"><button class="linkbtn" id="report">${icon('flag', 15)}Report this game</button></p>`}
      </div>
      <section class="comments" id="comments" aria-labelledby="c-head"></section>
    </div>
    <aside class="side">
      <div class="panel rating" id="rating"></div>
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
    api(`/games/${g.slug}/play`, { method: 'POST' }).then(r => {
      root.querySelector('#plays-n').textContent = fmt(r.plays); root.querySelector('#plays-w').textContent = r.plays === 1 ? 'play' : 'plays';
      if (state.me && d.rating.blocker === 'play') { d.rating.blocker = null; renderRating(); }
    }).catch(() => {});
  }
  // ---------- full screen / immersive ----------
  // Real fullscreen where the browser allows it (desktop, Android, iPad); on iPhone, which has no
  // fullscreen API for pages, the player simply covers the whole screen instead.
  const phone = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;
  const wantLandscape = aw > ah, wantPortrait = aw < ah;
  const rotateEl = root.querySelector('#rotate');
  let immersive = false, rotateDismissed = false;
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  function checkRotate() {
    const landscape = innerWidth > innerHeight;
    const wrong = immersive && phone && !rotateDismissed && ((wantLandscape && !landscape) || (wantPortrait && landscape));
    rotateEl.hidden = !wrong;
    if (wrong) root.querySelector('#rotate-t').textContent = wantLandscape ? 'Turn your phone sideways' : 'Turn your phone upright';
  }
  function enterImmersive() {
    start();
    if (immersive) return;
    immersive = true;
    player.classList.add('immersive'); document.documentElement.classList.add('immersive-on');
    const req = player.requestFullscreen || player.webkitRequestFullscreen;
    if (req) {
      try {
        Promise.resolve(req.call(player, { navigationUI: 'hide' }))
          .then(() => { if (phone && (wantLandscape || wantPortrait)) screen.orientation?.lock?.(wantLandscape ? 'landscape' : 'portrait').catch(() => {}); })
          .catch(() => {});
      } catch { /* the overlay still works */ }
    } else if (phone) {
      try { if (!localStorage.getItem('snk-a2hs')) { localStorage.setItem('snk-a2hs', '1'); toast('Tip: add Snackbar to your Home Screen (Share → Add to Home Screen) and games get the whole screen, no browser bars.', { pip: '📱', ms: 7000 }); } } catch { /* private mode */ }
    }
    checkRotate();
    setTimeout(() => iframe?.focus(), 150);
  }
  function exitImmersive() {
    if (!immersive) return;
    immersive = false;
    player.classList.remove('immersive'); document.documentElement.classList.remove('immersive-on');
    try { screen.orientation?.unlock?.(); } catch { /* not supported */ }
    if (fsEl()) Promise.resolve((document.exitFullscreen || document.webkitExitFullscreen).call(document)).catch(() => {});
    rotateEl.hidden = true;
  }
  const onFs = () => { if (!fsEl() && immersive) exitImmersive(); };
  document.addEventListener('fullscreenchange', onFs); document.addEventListener('webkitfullscreenchange', onFs);
  addEventListener('resize', checkRotate);
  root.querySelector('#imm-exit').addEventListener('click', exitImmersive);
  root.querySelector('#rotate-ok').addEventListener('click', () => { rotateDismissed = true; checkRotate(); iframe?.focus(); });
  // On a phone, Play goes straight to full screen: a game squeezed into the page is too small to play.
  root.querySelector('#poster').addEventListener('click', () => phone ? enterImmersive() : start());
  root.querySelector('#restart').addEventListener('click', () => { if (iframe) { iframe.src = g.playUrl; iframe.focus(); } });
  root.querySelector('#fs').addEventListener('click', enterImmersive);
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
  root.querySelector('#report')?.addEventListener('click', () => reportModal({ kind: 'game', slug: g.slug, what: g.title }));

  // ---------- Snack Score ----------
  const ratingEl = root.querySelector('#rating');
  function renderRating() {
    ratingEl.innerHTML = ratingHtml(d.rating, g);
    const btns = [...ratingEl.querySelectorAll('[data-stars]')], label = ratingEl.querySelector('#rate-label');
    const labels = state.meta.ratingLabels;
    const show = n => { btns.forEach(b => b.classList.toggle('hot', +b.dataset.stars <= n)); label.textContent = n ? labels[n] : (d.rating.mine ? `You said: ${labels[d.rating.mine]}` : 'Tap a cookie'); };
    btns.forEach(b => {
      b.addEventListener('mouseenter', () => show(+b.dataset.stars));
      b.addEventListener('focus', () => show(+b.dataset.stars));
      b.addEventListener('click', async () => {
        const stars = +b.dataset.stars;
        btns.forEach(x => x.disabled = true);
        try {
          const r = await api(`/games/${g.slug}/rate`, { method: 'POST', body: { stars } });
          d.rating = r.rating; renderRating();
          ratingEl.querySelector('#rate-label').textContent = `You said: ${labels[stars]}. Thanks!`;
        } catch (err) { toastError(err.message); btns.forEach(x => x.disabled = false); }
      });
    });
    ratingEl.querySelector('.bites')?.addEventListener('mouseleave', () => show(0));
    if (label) show(0);
  }
  renderRating();

  // ---------- comments ----------
  const cEl = root.querySelector('#comments');
  const max = state.meta.commentMax;
  cEl.innerHTML = `<h2 id="c-head">Comments <small class="num" id="c-total">${fmt(d.comments.total)}</small></h2>
    ${state.me ? `<form class="c-form" id="c-form"><span class="av">${avatarHtml(state.me)}</span>
        <div class="field"><label class="sr" for="c-body">Your comment</label><textarea id="c-body" maxlength="${max}" rows="3" placeholder="What did you think? Tips, high scores, bugs, all welcome. Keep it friendly."></textarea>
        <div class="c-actions"><span class="muted num" id="c-count">0 / ${max}</span><button class="btn primary small" id="c-send" disabled>${icon('chat', 16)}Post it</button></div></div></form>`
      : `<p class="c-signin"><a href="/login?next=/game/${esc(g.slug)}">Sign in</a> to join the chat. Takes ten seconds.</p>`}
    <ol class="clist" id="clist">${d.comments.items.map(commentHtml).join('')}</ol>
    ${d.comments.items.length ? '' : '<p class="muted" id="c-empty">No comments yet. Say something nice, or at least something useful.</p>'}
    <div class="c-more"><button class="btn small" id="c-more" ${d.comments.total > d.comments.items.length ? '' : 'hidden'}>Show older comments</button></div>`;
  const list = cEl.querySelector('#clist');
  let loaded = d.comments.items.length, total = d.comments.total;
  const setTotal = n => { total = n; cEl.querySelector('#c-total').textContent = fmt(n); };
  const form = cEl.querySelector('#c-form');
  if (form) {
    const ta = form.querySelector('textarea'), send = form.querySelector('#c-send'), count = form.querySelector('#c-count');
    ta.addEventListener('input', () => { count.textContent = `${ta.value.length} / ${max}`; send.disabled = ta.value.trim().length < 2; });
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !send.disabled) form.requestSubmit(); });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      send.disabled = true;
      try {
        const r = await api(`/games/${g.slug}/comments`, { method: 'POST', body: { body: ta.value } });
        list.insertAdjacentHTML('afterbegin', commentHtml(r.comment)); loaded++;
        cEl.querySelector('#c-empty')?.remove();
        setTotal(r.total); ta.value = ''; count.textContent = `0 / ${max}`;

      } catch (err) { toastError(err.message); send.disabled = false; }
    });
  }
  cEl.querySelector('#c-more').addEventListener('click', async e => {
    const btn = e.currentTarget; btn.disabled = true;
    try {
      const r = await api(`/games/${g.slug}/comments?offset=${loaded}`);
      list.insertAdjacentHTML('beforeend', r.items.map(commentHtml).join('')); loaded += r.items.length;
      btn.hidden = loaded >= r.total; btn.disabled = false;
    } catch (err) { toastError(err.message); btn.disabled = false; }
  });
  // Delete is a two-step button: first click arms it, second click deletes.
  list.addEventListener('click', async e => {
    const rep = e.target.closest('[data-report]');
    if (rep) return reportModal({ kind: 'comment', commentId: +rep.dataset.report, what: 'this comment' });
    const btn = e.target.closest('[data-del]');
    if (!btn) return;
    if (!btn.classList.contains('armed')) { btn.classList.add('armed'); btn.textContent = 'Sure? Delete'; setTimeout(() => { btn.classList.remove('armed'); btn.textContent = 'Delete'; }, 4000); return; }
    btn.disabled = true;
    try {
      await api(`/comments/${btn.dataset.del}`, { method: 'DELETE' });
      btn.closest('li').remove(); loaded--; setTotal(Math.max(0, total - 1));
    } catch (err) { toastError(err.message); btn.disabled = false; }
  });

  return () => {
    exitImmersive();
    removeEventListener('message', onMessage); removeEventListener('resize', checkRotate);
    document.removeEventListener('visibilitychange', onVis); document.removeEventListener('fullscreenchange', onFs); document.removeEventListener('webkitfullscreenchange', onFs);
  };
}

function ratingHtml(r, g) {
  const labels = state.meta.ratingLabels;
  const head = r.count
    ? `<div class="score-head"><b class="score-num num">${r.avg.toFixed(1)}</b><div><div class="avg-bites" aria-hidden="true">${[1, 2, 3, 4, 5].map(n => bite(r.avg >= n - .25, 20)).join('')}</div>
        <small class="muted">${fmt(r.count)} ${r.count === 1 ? 'rating' : 'ratings'} · mostly “${labels[Math.max(1, Math.min(5, Math.round(r.avg)))]}”</small></div></div>
      <div class="dist" aria-label="How people rated it">${[5, 4, 3, 2, 1].map(n => { const c = r.dist[n - 1], pct = r.count ? Math.round(c / r.count * 100) : 0;
        return `<div class="drow"><span>${n}</span><span class="bar"><i style="width:${pct}%"></i></span><span class="num muted">${c}</span></div>`; }).join('')}</div>`
    : `<p class="muted">No ratings yet. Play it and be the first.</p>`;
  const why = { signin: `<a href="/login?next=/game/${esc(g.slug)}">Sign in</a> to rate it.`, own: "It's your game, so you can't rate it. Nice try though.", play: 'Give it a play first, then come back and rate it.' }[r.blocker];
  const me = why ? `<p class="rate-why">${why}</p>`
    : `<div class="rate-me"><span class="lab">${r.mine ? 'Your rating' : 'How was it?'}</span>
        <div class="bites" role="radiogroup" aria-label="Rate ${esc(g.title)}">${[1, 2, 3, 4, 5].map(n =>
          `<button type="button" role="radio" data-stars="${n}" aria-checked="${r.mine === n}" aria-label="${n} of 5: ${esc(labels[n])}" class="${r.mine >= n ? 'set' : ''}">${bite(r.mine >= n, 34)}</button>`).join('')}</div>
        <span class="rate-label" id="rate-label" aria-live="polite"></span></div>`;
  return `<h3 style="display:flex;gap:8px;align-items:center">${icon('cookie', 20)}Snack Score</h3>${head}${me}`;
}

function commentHtml(c) {
  const labels = state.meta.ratingLabels;
  return `<li class="comment"><a class="av" href="/u/${esc(c.user.username)}" tabindex="-1" aria-hidden="true">${avatarHtml(c.user)}</a>
    <div class="cbody"><div class="cmeta"><a href="/u/${esc(c.user.username)}">${esc(c.user.displayName)}</a><span class="lvl">Lv ${c.user.level}</span>
      ${c.stars ? `<span class="crated" title="Rated it ${c.stars}/5: ${esc(labels[c.stars])}">${bite(true, 14)}${c.stars}/5</span>` : ''}
      <time class="muted" datetime="${new Date(c.createdAt).toISOString()}">${ago(c.createdAt)}</time>
      <span class="cacts">${c.canReport ? `<button class="cdel" data-report="${c.id}">Report</button>` : ''}${c.canDelete ? `<button class="cdel" data-del="${c.id}">Delete</button>` : ''}</span></div>
    <p>${esc(c.body)}</p></div></li>`;
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
