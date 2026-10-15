import { api, state, esc, ago, toast, toastError, title, requireLogin, refreshMe } from '../core.js';

export async function render(root, _params, qs) {
  if (!state.me) return requireLogin('Sign in as an admin to see reports.');
  if (!state.me.isAdmin) { const e = new Error('Nothing on this shelf.'); e.status = 404; throw e; }
  const status = qs.get('status') === 'closed' ? 'closed' : 'open';
  const d = await api('/admin/reports?status=' + status);
  title('Reports');
  const reasons = Object.fromEntries([...state.meta.reportReasons.game, ...state.meta.reportReasons.comment]);

  const card = r => {
    const g = r.game;
    const target = r.kind === 'game'
      ? (g ? `<a href="/game/${esc(g.slug)}">${esc(g.title)}</a>${g.author ? ` by <a href="/u/${esc(g.author)}">@${esc(g.author)}</a>` : ' (original)'}${g.takenDown ? ' <span class="pill bad">taken down</span>' : g.status === 'hidden' ? ' <span class="pill">hidden</span>' : ''}` : `${esc(r.snapshot)} <span class="pill">deleted</span>`)
      : `comment on ${g ? `<a href="/game/${esc(g.slug)}#comments">${esc(g.title)}</a>` : 'a deleted game'}${r.commentExists ? '' : ' <span class="pill">deleted</span>'}`;
    const acts = status === 'open'
      ? [r.kind === 'game' && g ? `<button class="btn small danger" data-act="takedown">Take it down</button>` : '',
         r.kind === 'comment' && r.commentExists ? `<button class="btn small danger" data-act="delete-comment">Delete comment</button>` : '',
         `<button class="btn small" data-act="dismiss">Dismiss</button>`].join('')
      : (r.kind === 'game' && g?.takenDown ? `<button class="btn small" data-act="restore">Put it back live</button>` : '');
    return `<li class="panel report ${r.reason === 'copyright' || r.reason === 'malware' ? 'urgent' : ''}" data-id="${r.id}">
      <div class="rhead"><span class="pill">${esc(reasons[r.reason] || r.reason)}</span><span class="muted">${r.kind}</span>
        ${r.openSame > 1 ? `<span class="pill bad">${r.openSame} reports</span>` : ''}<time class="muted">${ago(r.createdAt)}</time></div>
      <p class="rtarget">${target}</p>
      ${r.kind === 'comment' ? `<blockquote>${esc(r.snapshot)}</blockquote>` : ''}
      ${r.details ? `<p class="rdetails">${esc(r.details)}</p>` : ''}
      <p class="muted small">From ${r.reporter ? `<a href="/u/${esc(r.reporter)}">@${esc(r.reporter)}</a>` : 'a visitor'}${r.contact ? ` · <a href="mailto:${esc(r.contact)}">${esc(r.contact)}</a>` : ''}
        ${status === 'closed' ? ` · ${esc(r.status)}${r.resolver ? ` by @${esc(r.resolver)}` : ''} ${r.resolvedAt ? ago(r.resolvedAt) : ''}` : ''}</p>
      ${acts ? `<div class="racts">${acts}</div>` : ''}</li>`;
  };

  root.innerHTML = `<div class="wrap admin">
    <div class="page-head"><h1 style="font-size:clamp(2rem,4vw,3rem)">Reports</h1>
      <p>Copyright and malware first. Taking a game down hides it and stops the uploader from putting it back live. You can undo it from the Closed tab.</p>
      <nav class="legal-switch"><a href="/admin/reports" ${status === 'open' ? 'aria-current="page"' : ''}>Open (${d.open})</a><a href="/admin/reports?status=closed" ${status === 'closed' ? 'aria-current="page"' : ''}>Closed</a></nav></div>
    ${d.items.length ? `<ol class="reports">${d.items.map(card).join('')}</ol>` : `<p class="muted" style="padding:20px 0 60px">${status === 'open' ? 'Inbox zero. Go play something.' : 'Nothing closed yet.'}</p>`}
  </div>`;

  root.querySelector('.reports')?.addEventListener('click', async e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const li = btn.closest('[data-id]'), act = btn.dataset.act;
    if (act !== 'dismiss' && !confirm({ takedown: 'Take this game down?', 'delete-comment': 'Delete this comment?', restore: 'Put this game back live?' }[act])) return;
    li.querySelectorAll('button').forEach(b => b.disabled = true);
    try {
      await api(`/admin/reports/${li.dataset.id}`, { method: 'POST', body: { action: act } });
      toast({ takedown: 'Taken down.', 'delete-comment': 'Comment deleted.', dismiss: 'Dismissed.', restore: 'Back live.' }[act], { pip: '✓' });
      refreshMe();
      render(root, _params, qs);
    } catch (err) { toastError(err.message); li.querySelectorAll('button').forEach(b => b.disabled = false); }
  });
}
