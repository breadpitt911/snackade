import { api, state, esc, icon, fmt, title } from '../core.js';
import { coverHtml } from '../components.js';
import { bite, medal } from '../art.js';

const monthName = (m, opts = { month: 'long', year: 'numeric' }) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleString('en', { ...opts, timeZone: 'UTC' });
};
const bites = avg => `<span class="avg-bites" aria-label="${avg.toFixed(1)} out of 5">${[1, 2, 3, 4, 5].map(n => bite(avg >= n - .25, 18)).join('')}</span>`;
const by = g => g.author ? `by <a href="/u/${esc(g.author.username)}">${esc(g.author.displayName)}</a>` : `a ${esc(state.meta.siteName)} original`;

export async function render(root) {
  const d = await api('/hall-of-fame');
  title('Hall of Fame');
  const daysLeft = Math.max(0, Math.ceil((d.endsAt - Date.now()) / 864e5));
  const { minVotes, prizes } = d.rules;

  root.innerHTML = `<div class="wrap hof">
    <div class="page-head"><h1 style="font-size:clamp(2rem,4vw,3.2rem)">Hall of Fame</h1>
      <p>Every month, the best-rated game takes the crown. Rate the games you play and your vote counts toward this month's race.</p></div>

    <section class="panel race" aria-labelledby="race-h">
      <div class="race-head"><h2 id="race-h">The race for ${monthName(d.month, { month: 'long' })}</h2>
        <span class="pill">${daysLeft === 0 ? 'Ends today' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`}</span></div>
      ${d.race.length ? `<ol class="race-list">${d.race.map((r, i) => `<li class="${r.eligible ? '' : 'pending'}">
          <span class="rk num">${r.eligible ? i + 1 : '–'}</span>
          <a class="thumb" href="/game/${esc(r.game.slug)}" tabindex="-1" aria-hidden="true">${coverHtml(r.game, { small: true })}</a>
          <div class="who"><a href="/game/${esc(r.game.slug)}">${esc(r.game.title)}</a><small>${by(r.game)}</small></div>
          <div class="how">${bites(r.avg)}<small class="num">${r.avg.toFixed(1)} from ${fmt(r.votes)} ${r.votes === 1 ? 'rating' : 'ratings'}${r.eligible ? '' : `, needs ${minVotes - r.votes} more to place`}</small></div>
        </li>`).join('')}</ol>`
        : `<p class="muted">Nobody's rated anything this month yet. Go <a href="/games">play something</a> and rate it. One vote could start a dynasty.</p>`}
      <p class="fine">How it's decided: a weighted average of the ratings given this month, so one lonely 5 can't beat a pile of 4.6s. A game needs at least ${minVotes} ratings to place. Winners lock in automatically when the month ends (UTC). The maker of the winner gets ${fmt(prizes[0])} XP and the Game of the Month badge, 2nd gets ${fmt(prizes[1])}, 3rd gets ${fmt(prizes[2])}.</p>
    </section>

    <section class="past" aria-labelledby="past-h">
      <h2 id="past-h">Past winners</h2>
      ${d.past.some(m => m.winners.length) ? d.past.filter(m => m.winners.length).map(m => `<article class="month">
          <h3>${monthName(m.month)}</h3>
          <div class="podium-row">${m.winners.map(w => `<div class="spot p${w.place}">
              <span class="medal-wrap" aria-hidden="true">${w.place === 1 ? medal('trophy') : `<b class="place num">${w.place}</b>`}</span>
              ${w.game.live ? `<a class="thumb" href="/game/${esc(w.game.slug)}" tabindex="-1" aria-hidden="true">${coverHtml(w.game, { small: true })}</a>` : `<span class="thumb">${coverHtml(w.game, { small: true })}</span>`}
              <div>${w.place === 1 ? '<span class="crown-tag">Game of the Month</span>' : ''}
                ${w.game.live ? `<a class="t" href="/game/${esc(w.game.slug)}">${esc(w.game.title)}</a>` : `<span class="t">${esc(w.game.title)}</span>`}
                <small>${by(w.game)}</small><small class="num">${w.avg.toFixed(1)} avg, ${fmt(w.votes)} ratings</small></div>
            </div>`).join('')}</div></article>`).join('')
        : `<div class="empty-past">${medal('trophy')}<p class="muted">No winners yet. The first Game of the Month gets crowned when ${monthName(d.month, { month: 'long' })} ends.</p></div>`}
    </section>
  </div>`;
}
