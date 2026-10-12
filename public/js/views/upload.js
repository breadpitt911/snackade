import { apiUpload, state, esc, icon, go, title, fmt } from '../core.js';
import { cart } from '../components.js';
import { CAT_NAMES } from '../art.js';

const KINDS = {
  html5: { icon: 'zip', name: 'HTML5 zip', blurb: 'A zipped folder with an index.html', file: '.zip',
    tip: 'Zip the folder that contains <code>index.html</code>. Phaser, PixiJS, Three.js, Construct, GDevelop and Godot web exports all work.' },
  html: { icon: 'html', name: 'Single HTML', blurb: 'One self-contained .html file', file: '.html,.htm',
    tip: 'Everything inline in one file: scripts, styles and assets as data URLs. Great for jam games and canvas toys.' },
  github: { icon: 'github', name: 'GitHub repo', blurb: 'Import straight from a public repo', file: null,
    tip: 'We grab the repo and look for <code>index.html</code> in the root, <code>dist/</code>, <code>build/</code>, <code>docs/</code> or <code>public/</code>. Repos that need a build step should commit the built folder.' },
  unity: { icon: 'cube', name: 'Unity WebGL', blurb: 'A zipped WebGL build folder', file: '.zip',
    tip: 'In Unity use File → Build Settings → WebGL, then zip the output folder. Brotli and Gzip builds are served with the right headers. No index.html? We make one.' },
  embed: { icon: 'link', name: 'Hosted URL', blurb: 'A game already online (https)', file: null,
    tip: 'Use a link that loads the game full-window, like a GitHub Pages or itch.io embed URL. The site has to allow being shown in a frame.' },
};

export async function render(root) {
  title('Upload a game');
  if (!state.me) {
    root.innerHTML = `<div class="wrap"><div class="auth panel" style="text-align:center;display:grid;gap:12px;justify-items:center">
      <div class="reward" style="width:100%;justify-content:center"><b>+${state.meta.rules.upload.xp} XP</b><span>for every game you publish</span></div>
      <h1 style="font-size:2.2rem">Sign in to upload</h1>
      <p class="muted">Your games live on your profile, and you'll earn XP every time someone new plays or likes one.</p>
      <div style="display:flex;gap:10px"><a class="btn primary" href="/signup?next=/upload">Create an account</a><a class="btn" href="/login?next=/upload">Sign in</a></div></div></div>`;
    return;
  }
  let kind = 'html5', file = null, coverFile = null, coverUrl = null;
  const cats = state.meta.categories;

  root.innerHTML = `<div class="wrap">
    <div class="page-head"><h1 style="font-size:clamp(2rem,4vw,3.2rem)">Upload a game</h1>
      <p>Pick how your game is packaged, add a title and a few words, and it goes live right away.</p></div>
    <div class="upload-layout">
      <form id="up" class="form-grid" novalidate>
        <div class="field"><span class="lab" id="kind-lab">How is your game packaged?</span>
          <div class="kinds" role="group" aria-labelledby="kind-lab">${Object.entries(KINDS).map(([k, v]) => `<button type="button" class="kind" data-kind="${k}" aria-pressed="${k === kind}">${icon(v.icon)}<b>${v.name}</b><small>${v.blurb}</small></button>`).join('')}</div></div>
        <div id="source"></div>
        <div class="field"><label for="u-title">Title</label><input id="u-title" name="title" maxlength="60" required placeholder="Give it a name people will remember"></div>
        <div class="field"><label for="u-desc">Description</label><textarea id="u-desc" name="description" maxlength="1200" placeholder="What's the game about? What makes it fun?"></textarea></div>
        <div class="field"><label for="u-ins">How to play</label><textarea id="u-ins" name="instructions" maxlength="600" style="min-height:70px" placeholder="Arrow keys to move, space to jump…"></textarea></div>
        <div class="two">
          <div class="field"><label for="u-cat">Category</label><select id="u-cat" name="category">${cats.map(c => `<option value="${c}">${CAT_NAMES[c]}</option>`).join('')}</select></div>
          <div class="field"><label for="u-ar">Screen shape</label><select id="u-ar" name="aspect"><option value="16:9">Widescreen 16:9</option><option value="4:3">Classic 4:3</option><option value="1:1">Square 1:1</option><option value="9:16">Tall 9:16 (phone)</option></select></div>
        </div>
        <div class="field"><label for="u-tags">Tags</label><input id="u-tags" name="tags" placeholder="retro, puzzle, two-player"><span class="hint">Up to 8, separated by commas.</span></div>
        <div class="field"><label for="u-cover">Cover image (optional)</label><input id="u-cover" type="file" accept="image/png,image/jpeg,image/webp,image/gif"><span class="hint">4:3 works best. Skip it and we'll draw one for you.</span></div>
        <div id="u-msg"></div>
        <div id="u-prog" hidden><div class="progress"><i></i></div><p class="muted" id="u-prog-t" style="margin-top:6px">Uploading…</p></div>
        <div><button class="btn primary big" id="u-go">${icon('upload')}Publish game</button></div>
      </form>
      <aside class="side">
        <div class="reward"><b>+${state.meta.rules.upload.xp} XP</b><span>when your game goes live, plus ${state.meta.rules.playReceived.xp} XP per new player each day and ${state.meta.rules.likeReceived.xp} XP per like.</span></div>
        <div><span class="lab" style="font-weight:700">Preview</span><div class="preview-cart" id="preview" style="margin-top:10px"></div></div>
        <div class="panel tips"><h3 id="tip-h"></h3><p id="tip"></p>
          <p>Want a leaderboard? Call <code>Snackade.submitScore(score)</code> from your game when a run ends. The helper is added to every game automatically.</p></div>
      </aside>
    </div></div>`;

  const $ = s => root.querySelector(s);
  const form = $('#up');

  function renderSource() {
    const k = KINDS[kind];
    $('#tip-h').textContent = k.name;
    $('#tip').innerHTML = k.tip;
    if (kind === 'github') {
      $('#source').innerHTML = `<div class="form-grid"><div class="field"><label for="u-repo">Repository link</label><input id="u-repo" name="repoUrl" type="url" placeholder="https://github.com/you/your-game" required></div>
        <div class="two"><div class="field"><label for="u-branch">Branch</label><input id="u-branch" name="branch" placeholder="Default branch"></div>
        <div class="field"><label for="u-sub">Folder in the repo</label><input id="u-sub" name="subdir" placeholder="e.g. dist (optional)"></div></div></div>`;
    } else if (kind === 'embed') {
      $('#source').innerHTML = `<div class="field"><label for="u-url">Game link</label><input id="u-url" name="embedUrl" type="url" placeholder="https://you.github.io/your-game/" required></div>`;
    } else {
      const maxMb = kind === 'html' ? state.meta.limits.htmlMB : state.meta.limits.zipMB;
      $('#source').innerHTML = `<label class="drop" id="drop" for="u-file">${icon(kind === 'html' ? 'html' : 'zip')}
        <b>${file ? `<span class="file">${esc(file.name)}</span>` : `Drop your ${kind === 'html' ? '.html file' : '.zip'} here`}</b>
        <span class="muted">${file ? `${(file.size / 1048576).toFixed(1)} MB. Click to choose a different file.` : `or click to choose one. Up to ${maxMb} MB.`}</span>
        <input id="u-file" type="file" accept="${k.file}" class="sr"></label>`;
      const drop = $('#drop'), input = $('#u-file');
      input.addEventListener('change', () => { if (input.files[0]) { file = input.files[0]; guessTitle(); renderSource(); } });
      ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
      ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
      drop.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) { file = f; guessTitle(); renderSource(); } });
    }
    $('#u-repo')?.addEventListener('change', () => { const m = $('#u-repo').value.match(/github\.com\/[^/]+\/([^/#?]+)/); if (m && !$('#u-title').value) { $('#u-title').value = pretty(m[1]); preview(); } });
  }
  const pretty = s => s.replace(/\.(zip|html?)$/i, '').replace(/\.git$/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
  function guessTitle() { if (file && !$('#u-title').value) { $('#u-title').value = pretty(file.name); preview(); } }
  function preview() {
    const g = { slug: 'preview', title: $('#u-title').value || 'Your game', category: $('#u-cat').value, cover: coverUrl, coverSeed: 7, plays: 0, likes: 0, createdAt: Date.now(), author: state.me, status: 'live' };
    $('#preview').innerHTML = cart(g).replace('<a class="cart" href="/game/preview"', '<div class="cart"').replace(/<\/a>$/, '</div>');
  }

  root.querySelectorAll('.kind').forEach(b => b.addEventListener('click', () => {
    kind = b.dataset.kind; file = null;
    root.querySelectorAll('.kind').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    renderSource();
  }));
  $('#u-title').addEventListener('input', preview);
  $('#u-cat').addEventListener('change', preview);
  $('#u-cover').addEventListener('change', e => {
    coverFile = e.target.files[0] || null;
    if (coverUrl) URL.revokeObjectURL(coverUrl);
    coverUrl = coverFile ? URL.createObjectURL(coverFile) : null;
    preview();
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = $('#u-msg'); msg.innerHTML = '';
    const fail = t => { msg.innerHTML = `<div class="err">${esc(t)}</div>`; };
    if (!$('#u-title').value.trim()) return fail('Give your game a title.');
    if (KINDS[kind].file && !file) return fail(`Choose a ${kind === 'html' ? '.html' : '.zip'} file to upload.`);
    if (kind === 'github' && !/github\.com\/[^/]+\/[^/]+/.test($('#u-repo').value)) return fail('Paste a link like https://github.com/owner/repo');
    if (kind === 'embed' && !/^https:\/\//.test($('#u-url').value)) return fail('Hosted games need an https:// link.');

    const fd = new FormData(form);
    fd.set('kind', kind);
    if (file) fd.set('file', file);
    if (coverFile) fd.set('cover', coverFile);
    const btn = $('#u-go'), prog = $('#u-prog'), bar = prog.querySelector('i');
    btn.disabled = true; prog.hidden = false; bar.style.width = '0';
    $('#u-prog-t').textContent = kind === 'github' ? 'Fetching from GitHub…' : 'Uploading…';
    try {
      const r = await apiUpload('/upload', fd, p => {
        bar.style.width = Math.round(p * 100) + '%';
        if (p >= 1) $('#u-prog-t').textContent = kind === 'unity' || kind === 'html5' ? 'Unpacking your build…' : 'Publishing…';
      });
      bar.style.width = '100%';
      go(`/game/${r.game.slug}`);
    } catch (err) {
      fail(err.message); btn.disabled = false; prog.hidden = true;
    }
  });

  renderSource(); preview();
  return () => { if (coverUrl) URL.revokeObjectURL(coverUrl); };
}
export { fmt };
