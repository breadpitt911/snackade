import { api, state, esc, modal, toast } from './core.js';

// Report a game or a comment. Works signed out too (rights holders usually don't have accounts).
export function reportModal({ kind, slug, commentId, what }) {
  const reasons = state.meta.reportReasons[kind];
  const max = state.meta.reportDetailsMax;
  const close = modal(`<form id="rf" class="form-grid report-form" novalidate>
    <h2>Report ${esc(what)}</h2>
    <p class="muted">A real person reads every report. If something's illegal or breaks the <a href="/terms#rules" target="_blank">house rules</a>, it comes down.</p>
    <div class="field"><label for="r-reason">What's wrong?</label>
      <select id="r-reason" name="reason">${reasons.map(([k, label]) => `<option value="${k}">${esc(label)}</option>`).join('')}</select></div>
    <div class="field"><label for="r-details">Details <small class="muted" id="r-dopt">(optional)</small></label>
      <textarea id="r-details" name="details" maxlength="${max}" rows="4"></textarea><span class="hint" id="r-hint"></span></div>
    <div class="field"><label for="r-contact">Your email <small class="muted" id="r-copt">(optional)</small></label>
      <input id="r-contact" name="contact" type="email" maxlength="120" autocomplete="email" value="">
      <span class="hint">Only used to follow up on this report.</span></div>
    <div id="r-err" role="alert"></div>
    <div class="report-actions"><button type="button" class="btn" data-close>Cancel</button><button class="btn primary" id="r-send">Send report</button></div>
  </form>`);
  const f = document.getElementById('rf');
  f.closest('.modal').classList.add('wide');
  const hints = {
    copyright: "Say which work is yours and link to the original. Confirm you own it or act for the owner, and that you believe in good faith this use isn't allowed.",
    malware: 'What did it do? Popups, redirects, asked for a password, something else?',
    broken: 'What happens? Blank screen, error message, controls not working? Which browser?',
    other: 'Tell us what the problem is.',
  };
  const sync = () => {
    const r = f.reason.value, copy = r === 'copyright', needs = copy || r === 'other';
    f.details.required = needs; f.contact.required = copy;
    f.querySelector('#r-dopt').hidden = needs; f.querySelector('#r-copt').hidden = copy;
    f.querySelector('#r-hint').textContent = hints[r] || '';
  };
  f.reason.addEventListener('change', sync); sync();
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = f.querySelector('#r-send'); btn.disabled = true;
    try {
      const r = await api('/reports', { method: 'POST', body: { kind, slug, commentId, reason: f.reason.value, details: f.details.value, contact: f.contact.value } });
      close();
      toast(r.duplicate ? "Already got your report on this one. We're on it." : "Thanks, report sent. We'll take a look.", { pip: '✓' });
    } catch (err) {
      f.querySelector('#r-err').innerHTML = `<div class="err">${esc(err.message)}</div>`;
      btn.disabled = false;
    }
  });
}
