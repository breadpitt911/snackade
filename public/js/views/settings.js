import { api, state, esc, avatar, setMe, toast, go, title, requireLogin } from '../core.js';
import { AV_COLORS } from '../art.js';

export async function render(root) {
  if (!state.me) return requireLogin('Sign in to edit your profile.');
  title('Edit profile');
  const me = state.me;
  const av = { shape: 0, color: 0, eyes: 0, extra: 0, ...me.avatar };
  const OPTS = [['shape', 'Body', 5], ['color', 'Color', 8], ['eyes', 'Eyes', 5], ['extra', 'Topper', 6]];

  root.innerHTML = `<div class="wrap" style="max-width:760px">
    <div class="page-head"><h1 style="font-size:clamp(2rem,4vw,3rem)">Edit profile</h1><p>Build your snack, say hello. Adding a bio earns ${state.meta.rules.profile.xp} XP once.</p></div>
    <form id="pf" class="panel form-grid" style="margin-bottom:50px">
      <div class="av-builder">
        <div id="av-big" style="border:2.5px solid var(--ink);border-radius:30px;overflow:hidden;box-shadow:var(--shadow)"></div>
        <div class="opts">${OPTS.map(([k, label, n]) => `<div class="opt-row" role="group" aria-label="${label}"><span>${label}</span>${Array.from({ length: n }, (_, i) => `<button type="button" data-k="${k}" data-v="${i}" aria-label="${label} ${i + 1}">${k === 'color' ? `<span style="display:block;width:100%;height:100%;border-radius:6px;background:${AV_COLORS[i]}"></span>` : avatar({ ...av, [k]: i })}</button>`).join('')}</div>`).join('')}
          <div><button type="button" class="btn small" id="shuffle">Shuffle</button></div></div>
      </div>
      <div class="field"><label for="p-name">Display name</label><input id="p-name" name="displayName" maxlength="32" value="${esc(me.displayName)}"></div>
      <div class="field"><label for="p-bio">Bio</label><textarea id="p-bio" name="bio" maxlength="280" placeholder="Favourite games, what you're building, high scores you're proud of…">${esc(me.bio || '')}</textarea></div>
      <div style="display:flex;gap:10px"><button class="btn primary">Save profile</button><a class="btn ghost" href="/u/${esc(me.username)}">Cancel</a></div>
    </form></div>`;

  const paint = () => {
    root.querySelector('#av-big').innerHTML = avatar(av);
    root.querySelectorAll('[data-k]').forEach(b => {
      b.setAttribute('aria-pressed', String(av[b.dataset.k] === +b.dataset.v));
      if (b.dataset.k !== 'color') b.innerHTML = avatar({ ...av, [b.dataset.k]: +b.dataset.v });
    });
  };
  root.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => { av[b.dataset.k] = +b.dataset.v; paint(); }));
  root.querySelector('#shuffle').addEventListener('click', () => { for (const [k, , n] of OPTS) av[k] = Math.floor(Math.random() * n); paint(); });
  paint();

  root.querySelector('#pf').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const r = await api('/me', { method: 'PATCH', body: { displayName: f.displayName.value, bio: f.bio.value, avatar: av } });
    setMe(r.user); toast('Saved profile', { pip: '✓' }); go('/u/' + r.user.username);
  });
}
