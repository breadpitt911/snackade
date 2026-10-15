import { api, esc, title } from '../core.js';

export async function render(root, [page]) {
  const d = await api('/legal/' + page);
  title(d.title);
  // d.html is our own server-side text (no user content), so it's safe to drop in as-is.
  root.innerHTML = `<div class="wrap legal">
    <div class="page-head"><h1 style="font-size:clamp(2rem,4vw,3rem)">${esc(d.title)}</h1>
      <p>Last updated <time datetime="${esc(d.updated)}">${esc(d.updatedText)}</time></p>
      <nav class="legal-switch" aria-label="Legal pages"><a href="/terms" ${page === 'terms' ? 'aria-current="page"' : ''}>Terms of Use</a><a href="/privacy" ${page === 'privacy' ? 'aria-current="page"' : ''}>Privacy Policy</a></nav></div>
    <article class="legal-body">${d.html}</article>
  </div>`;
  const id = location.hash.slice(1).replace(/[^\w-]/g, '');
  if (id) document.getElementById(id)?.scrollIntoView();
}
