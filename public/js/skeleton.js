// Placeholder shapes shown while a page loads. Used by the app between pages, and by the
// server for the very first paint (so nobody sees the plain-HTML version flash past).
const card = '<div class="sk-card"><div class="sk sk-img"></div><div class="sk sk-line"></div><div class="sk sk-line short"></div></div>';
const cards = n => `<div class="shelf">${card.repeat(n)}</div>`;
const head = '<div class="sk sk-line big"></div><div class="sk sk-line" style="width:min(520px,80%)"></div><div style="height:26px"></div>';
const wrap = inner => `<div class="wrap sk-wrap" aria-busy="true" aria-label="Loading">${inner}</div>`;

export function skeleton(path) {
  if (path === '/') return wrap(`<div class="sk sk-hero"></div><div style="height:28px"></div>${cards(5)}`);
  if (path.startsWith('/game/')) return wrap(`<div class="game-layout"><div><div class="sk sk-stage"></div>
    <div style="height:22px"></div><div class="sk sk-line big"></div><div class="sk sk-line"></div><div class="sk sk-line short"></div></div>
    <aside class="side"><div class="sk sk-panel"></div><div class="sk sk-panel"></div></aside></div>`);
  if (/^\/(admin|settings|upload|login|signup|terms|privacy)/.test(path)) return wrap(`${head}<div class="sk sk-panel"></div><div style="height:14px"></div><div class="sk sk-panel short"></div>`);
  return wrap(`${head}${cards(10)}`);
}
