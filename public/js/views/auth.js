import { api, state, esc, setMe, go, avatar, title } from '../core.js';

export async function render(root, [mode], qs) {
  const next = (qs.get('next') || '/').startsWith('/') ? qs.get('next') || '/' : '/';
  if (state.me) return go(next, { replace: true });
  const signup = mode === 'signup';
  title(signup ? 'Create an account' : 'Sign in');
  const av = { shape: Math.random() * 5 | 0, color: Math.random() * 8 | 0, eyes: Math.random() * 5 | 0, extra: Math.random() * 6 | 0 };

  root.innerHTML = `<div class="wrap"><div class="auth">
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
      <div style="width:84px;height:84px;border-radius:24px;overflow:hidden;border:2.5px solid var(--ink);box-shadow:var(--shadow);flex-shrink:0" id="av">${avatar(av)}</div>
      <div><h1>${signup ? 'Join the arcade' : 'Welcome back'}</h1><p class="muted">${signup ? 'Free forever. Your XP, scores and games stay with you.' : 'Pick up your streak where you left off.'}</p></div>
    </div>
    <form class="panel form-grid" id="f">
      <div class="field"><label for="a-user">Username</label><input id="a-user" name="username" autocomplete="username" required minlength="3" maxlength="20" pattern="[A-Za-z0-9_]+" autofocus>${signup ? '<span class="hint">3–20 letters, numbers or underscores. This is your profile link.</span>' : ''}</div>
      ${signup ? '<div class="field"><label for="a-name">Display name</label><input id="a-name" name="displayName" maxlength="32" placeholder="What should we call you?"></div>' : ''}
      <div class="field"><label for="a-pass">Password</label><input id="a-pass" name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" required minlength="${signup ? 8 : 1}">${signup ? '<span class="hint">At least 8 characters.</span>' : ''}</div>
      <div id="a-err"></div>
      <button class="btn primary big">${signup ? 'Create account' : 'Sign in'}</button>
    </form>
    <p class="switch">${signup ? `Already have an account? <a href="/login?next=${encodeURIComponent(next)}">Sign in</a>` : `New here? <a href="/signup?next=${encodeURIComponent(next)}">Create an account</a>`}</p>
  </div></div>`;

  if (signup) root.querySelector('#av').addEventListener('click', () => { av.shape = Math.random() * 5 | 0; av.color = Math.random() * 8 | 0; av.eyes = Math.random() * 5 | 0; av.extra = Math.random() * 6 | 0; root.querySelector('#av').innerHTML = avatar(av); });

  root.querySelector('#f').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, btn = f.querySelector('button');
    btn.disabled = true;
    try {
      const body = { username: f.username.value.trim(), password: f.password.value };
      if (signup) { body.displayName = f.displayName.value.trim(); body.avatar = av; }
      const r = await api(signup ? '/auth/signup' : '/auth/login', { method: 'POST', body });
      setMe(r.user);
      go(next, { replace: true });
    } catch (err) {
      root.querySelector('#a-err').innerHTML = `<div class="err">${esc(err.message)}</div>`;
      btn.disabled = false;
    }
  });
}
