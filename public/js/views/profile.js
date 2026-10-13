import { api, esc, icon, fmt, ago, avatarHtml, medal, title } from '../core.js';
import { shelf } from '../components.js';

export async function render(root, [username]) {
  const d = await api('/users/' + encodeURIComponent(username));
  const u = d.user, p = u.progress;
  title(`${u.displayName} (@${u.username})`);
  const earned = d.badges.filter(b => b.earnedAt).length;

  root.innerHTML = `<div class="wrap">
    <div class="profile-head">
      <div class="big-av">${avatarHtml(u)}</div>
      <div>
        <h1 style="font-size:clamp(2.2rem,4.6vw,3.6rem)">${esc(u.displayName)}</h1>
        <p class="handle">@${esc(u.username)}, joined ${ago(u.joined)}${u.streak > 1 ? `, on a ${u.streak}-day streak 🔥` : ''}</p>
        ${u.bio ? `<p class="bio">${esc(u.bio)}</p>` : d.isMe ? `<p class="bio muted">No bio yet. <a href="/settings">Write one</a>, it's worth 50 XP.</p>` : ''}
        <div class="levelbar">
          <div class="row"><span><b>Level ${p.level}</b> ${esc(p.title)}</span><span class="num">${fmt(p.xp)} / ${fmt(p.nextLevel)} XP</span></div>
          <div class="track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.pct}" aria-label="Progress to level ${p.level + 1}"><div class="fill" style="width:${Math.max(3, p.pct)}%"></div></div>
          <div class="row"><span>${fmt(p.nextLevel - p.xp)} XP until level ${p.level + 1}</span>${d.isMe ? `<a href="/settings" style="font-weight:700;color:var(--cobalt);text-decoration:none">Edit profile</a>` : ''}</div>
        </div>
      </div>
    </div>
    <div class="statgrid">
      <div class="stat"><b>${fmt(u.xp)}</b><span>total XP</span></div>
      <div class="stat"><b>${fmt(d.stats.gamesPlayed)}</b><span>games played</span></div>
      <div class="stat"><b>${fmt(d.games.length)}</b><span>games published</span></div>
      <div class="stat"><b>${fmt(d.stats.playsReceived)}</b><span>${d.isMe ? 'plays on your games' : 'plays on their games'}</span></div>
      <div class="stat"><b>${fmt(d.stats.likesReceived)}</b><span>likes received</span></div>
    </div>
    <div class="tabs" role="tablist">
      <button role="tab" aria-selected="true" data-tab="badges">Badges ${earned}/${d.badges.length}</button>
      <button role="tab" aria-selected="false" data-tab="games">Games ${d.games.length}</button>
      <button role="tab" aria-selected="false" data-tab="activity">Recent XP</button>
    </div>
    <div data-panel="badges"><div class="badges">${d.badges.map(b => `<div class="badge ${b.earnedAt ? '' : 'locked'}" title="${b.earnedAt ? 'Earned ' + ago(b.earnedAt) : 'Locked'}">${medal(b.icon)}<b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div>`).join('')}</div></div>
    <div data-panel="games" hidden>${d.games.length ? shelf(d.games) : `<div class="empty"><h3>No games yet</h3>${d.isMe ? `<p class="muted">Put one up and it'll live right here.</p><a class="btn lemon" href="/upload">${icon('upload')}Upload your game</a>` : '<p class="muted">Hasn\'t put anything up yet.</p>'}</div>`}</div>
    <div data-panel="activity" hidden>${d.activity.length ? `<ul class="activity panel" style="padding:4px 18px">${d.activity.map(a => `<li><span>${esc(a.label)} <span class="muted">${ago(a.created_at)}</span></span><b>+${fmt(a.amount)} XP</b></li>`).join('')}</ul>` : '<p class="muted">No XP yet. Go play something.</p>'}</div>
    <div style="height:40px"></div>
  </div>`;

  root.querySelectorAll('[role=tab]').forEach(t => t.addEventListener('click', () => {
    root.querySelectorAll('[role=tab]').forEach(x => x.setAttribute('aria-selected', String(x === t)));
    root.querySelectorAll('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== t.dataset.tab; });
  }));
}
