// Hand-drawn covers for the built-in games added in the second batch. Each returns a 320×240 SVG.
const INK = '#15131F';
const svg = (label, body, bg) => `<svg viewBox="0 0 320 240" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label} cover"><rect width="320" height="240" fill="${bg}"/>${body}</svg>`;
const cookie = (x, y, r) => `<g transform="translate(${x} ${y})"><circle r="${r}" fill="#e9a95c" stroke="${INK}" stroke-width="${r * .14}"/>${[[-.4, -.3], [.35, -.35], [0, .1], [-.3, .45], [.45, .35]].map(([a, b]) => `<circle cx="${a * r}" cy="${b * r}" r="${r * .14}" fill="#5b3420"/>`).join('')}</g>`;
const gummy = (x, y, s, col) => `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="-8" cy="-10" r="5" fill="${col}" stroke="${INK}" stroke-width="2"/><circle cx="8" cy="-10" r="5" fill="${col}" stroke="${INK}" stroke-width="2"/><ellipse cy="2" rx="12" ry="13" fill="${col}" stroke="${INK}" stroke-width="2"/><circle cx="-4" cy="-2" r="1.9" fill="${INK}"/><circle cx="4" cy="-2" r="1.9" fill="${INK}"/><path d="M-3 4a3 3 0 0 0 6 0" fill="none" stroke="${INK}" stroke-width="1.6"/></g>`;
const car = (x, y, rot, col, s = 1) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><rect x="-17" y="-29" width="34" height="58" rx="8" fill="rgba(0,0,0,.3)" transform="translate(4 5)"/><g fill="${INK}"><rect x="-20" y="-19" width="5" height="12"/><rect x="15" y="-19" width="5" height="12"/><rect x="-20" y="9" width="5" height="12"/><rect x="15" y="9" width="5" height="12"/></g><rect x="-17" y="-29" width="34" height="58" rx="8" fill="${col}" stroke="${INK}" stroke-width="2.5"/><rect x="-12" y="-19" width="24" height="12" rx="3" fill="#bfe8ff" stroke="${INK}" stroke-width="2"/><rect x="-11" y="-1" width="22" height="18" rx="3" fill="rgba(255,255,255,.35)"/></g>`;
const stars = n => Array.from({ length: n }, (_, i) => `<rect x="${(i * 97) % 320}" y="${(i * 61) % 240}" width="${1 + i % 3}" height="${1 + i % 3}" fill="#fff4e0" opacity="${.3 + (i % 4) * .15}"/>`).join('');

export const MORE_COVERS = {
  'paddle-pals': () => svg('Paddle Pals', `
    <rect y="0" width="320" height="14" fill="${INK}"/><rect y="226" width="320" height="14" fill="${INK}"/>
    <path d="M160 24v192" stroke="rgba(255,244,224,.25)" stroke-width="5" stroke-dasharray="14 12"/>
    <circle cx="160" cy="120" r="44" fill="none" stroke="rgba(255,244,224,.15)" stroke-width="5"/>
    <rect x="34" y="58" width="22" height="96" rx="11" fill="#ffc93c" stroke="${INK}" stroke-width="4"/><rect x="40" y="68" width="4" height="74" fill="rgba(255,255,255,.5)"/>
    <rect x="264" y="98" width="22" height="96" rx="11" fill="#ff5da2" stroke="${INK}" stroke-width="4"/>
    <g fill="#fff4e0"><circle cx="120" cy="104" r="6" opacity=".2"/><circle cx="146" cy="96" r="9" opacity=".3"/><circle cx="174" cy="88" r="12" opacity=".45"/></g>
    ${cookie(206, 82, 20)}`, '#0f3d4a'),

  'tank-tussle': () => svg('Tank Tussle', `
    <g fill="#28324a">${Array.from({ length: 24 }, (_, i) => `<rect x="${(i % 6) * 64 + (Math.floor(i / 6) % 2) * 32}" y="${Math.floor(i / 6) * 64}" width="32" height="32"/>`).join('')}</g>
    <g fill="#3d4a68" stroke="${INK}" stroke-width="3"><rect x="140" y="30" width="34" height="80"/><rect x="140" y="150" width="34" height="70"/><rect x="0" y="0" width="320" height="14"/><rect x="0" y="226" width="320" height="14"/></g>
    <path d="M110 150 L156 122 L230 166" fill="none" stroke="#fff4e0" stroke-width="3" stroke-dasharray="6 7" opacity=".7"/>
    <circle cx="230" cy="166" r="6" fill="#fff4e0" stroke="${INK}" stroke-width="2"/>
    ${[[70, 160, -30, '#ffc93c'], [250, 78, 150, '#2ee6c1']].map(([x, y, r, c]) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(1.9)"><rect x="-16" y="-15" width="32" height="8" rx="3" fill="${INK}"/><rect x="-16" y="7" width="32" height="8" rx="3" fill="${INK}"/><rect x="-13" y="-9" width="26" height="18" rx="5" fill="${c}" stroke="${INK}" stroke-width="2.5"/><rect x="2" y="-3" width="20" height="6" fill="${INK}"/><rect x="3" y="-2" width="18" height="4" fill="${c}"/><circle r="8" fill="${c}" stroke="${INK}" stroke-width="2.5"/></g>`).join('')}`, '#232c40'),

  'light-trails': () => svg('Light Trails', `
    <g stroke="rgba(142,108,240,.18)" stroke-width="1">${Array.from({ length: 16 }, (_, i) => `<path d="M${i * 20} 0v240"/>`).join('')}${Array.from({ length: 12 }, (_, i) => `<path d="M0 ${i * 20}h320"/>`).join('')}</g>
    <path d="M-10 190H90V70H220V150H260" fill="none" stroke="#ffc93c" stroke-width="18" opacity=".25"/><path d="M-10 190H90V70H220V150H260" fill="none" stroke="#ffc93c" stroke-width="9"/><path d="M-10 190H90V70H220V150H260" fill="none" stroke="#fff1b8" stroke-width="3"/>
    <path d="M330 40H270V200H140V110H180" fill="none" stroke="#2ee6c1" stroke-width="18" opacity=".25"/><path d="M330 40H270V200H140V110H180" fill="none" stroke="#2ee6c1" stroke-width="9"/><path d="M330 40H270V200H140V110H180" fill="none" stroke="#c4fff2" stroke-width="3"/>
    <circle cx="260" cy="150" r="14" fill="#ffc93c" opacity=".35"/><circle cx="260" cy="150" r="8" fill="#fff1b8" stroke="#ffc93c" stroke-width="3"/>
    <circle cx="180" cy="110" r="14" fill="#2ee6c1" opacity=".35"/><circle cx="180" cy="110" r="8" fill="#c4fff2" stroke="#2ee6c1" stroke-width="3"/>`, '#0c0a1d'),

  'four-up': () => svg('Four Up', `
    <circle cx="40" cy="30" r="50" fill="rgba(255,255,255,.04)"/><circle cx="290" cy="210" r="70" fill="rgba(255,255,255,.04)"/>
    <rect x="40" y="36" width="240" height="190" rx="14" fill="#3346ff" stroke="${INK}" stroke-width="5"/>
    ${Array.from({ length: 20 }, (_, i) => { const c = i % 5, r = Math.floor(i / 5), x = 70 + c * 45, y = 66 + r * 45; const p = ({ '0,3': 1, '1,2': 1, '2,1': 1, '3,0': 1, '1,3': 2, '2,3': 2, '2,2': 2, '3,3': 1, '4,3': 2, '3,2': 2, '3,1': 2 })[`${c},${r}`]; return `<circle cx="${x}" cy="${y}" r="17" fill="${p === 1 ? '#ffc93c' : p === 2 ? '#ff5a36' : '#1d1640'}" stroke="${INK}" stroke-width="3"/>${p ? `<circle cx="${x - 6}" cy="${y - 6}" r="3.5" fill="rgba(255,255,255,.55)"/>` : ''}`; }).join('')}
    <path d="M70 201L205 66" stroke="#fff4e0" stroke-width="7" stroke-linecap="round"/>`, '#1d1640'),

  'sumo-slam': () => svg('Sumo Slam', `
    <g fill="rgba(255,255,255,.04)">${[0, 1, 2, 3, 4].map(i => `<rect y="${i * 52}" width="320" height="26"/>`).join('')}</g>
    <ellipse cx="160" cy="150" rx="150" ry="78" fill="#1a0f1d"/><ellipse cx="160" cy="140" rx="146" ry="74" fill="#e8cf98" stroke="${INK}" stroke-width="4"/>
    <ellipse cx="160" cy="138" rx="120" ry="58" fill="#f3e2b3" stroke="#a07a3c" stroke-width="7"/>
    ${[[112, 124, '#ffc93c', '#c99a1d', 1], [206, 124, '#4fc3f7', '#2a8fbf', -1]].map(([x, y, c, d, f]) => `<g transform="translate(${x} ${y}) scale(${1.7 * (1 + .1)} 1.7)"><circle r="24" fill="${c}" stroke="${INK}" stroke-width="3"/><rect x="-23" y="7" width="46" height="8" fill="${d}"/><circle cx="${8 * f - 4}" cy="-5" r="5.5" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="${8 * f + 6}" cy="-5" r="5.5" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="${8 * f - 2}" cy="-5" r="2.5" fill="${INK}"/><circle cx="${8 * f + 8}" cy="-5" r="2.5" fill="${INK}"/><circle cx="${5 * f}" cy="9" r="4" fill="none" stroke="${INK}" stroke-width="2.5"/></g>`).join('')}
    <path d="M160 70l7 18 18-6-11 15 15 11-19 1 2 19-12-15-12 15 2-19-19-1 15-11-11-15 18 6z" fill="#fff4e0" stroke="${INK}" stroke-width="3"/>`, '#2a1a2e'),

  'turbo-laps': () => svg('Turbo Laps', `
    <g fill="#44964f">${Array.from({ length: 12 }, (_, i) => `<path d="M${i * 44 - 240} 0h22l240 240h-22z"/>`).join('')}</g>
    <path d="M-20 200C60 200 70 60 160 60S260 200 340 120" fill="none" stroke="${INK}" stroke-width="78"/>
    <path d="M-20 200C60 200 70 60 160 60S260 200 340 120" fill="none" stroke="#fff4e0" stroke-width="72"/>
    <path d="M-20 200C60 200 70 60 160 60S260 200 340 120" fill="none" stroke="#e8263f" stroke-width="72" stroke-dasharray="14 14"/>
    <path d="M-20 200C60 200 70 60 160 60S260 200 340 120" fill="none" stroke="#4a4658" stroke-width="62"/>
    <path d="M-20 200C60 200 70 60 160 60S260 200 340 120" fill="none" stroke="rgba(255,244,224,.4)" stroke-width="3" stroke-dasharray="16 16"/>
    ${car(118, 92, 55, '#ffc93c', .9)}${car(206, 96, 115, '#2ee6c1', .9)}
    <g transform="translate(266 26)"><path d="M0 0v52" stroke="${INK}" stroke-width="4"/>${[0, 1, 2, 3].map(r => [0, 1, 2, 3].map(c => `<rect x="${2 + c * 9}" y="${r * 7}" width="9" height="7" fill="${(r + c) % 2 ? INK : '#fff'}"/>`).join('')).join('')}</g>`, '#3d8b4a'),

  'sky-swarm': () => svg('Sky Swarm', `${stars(40)}
    <circle cx="250" cy="50" r="70" fill="rgba(142,108,240,.25)"/>
    ${[[70, 70, '#ff5da2'], [150, 46, '#ff5da2'], [230, 80, '#8e6cf0'], [110, 120, '#ff5da2']].map(([x, y, c]) => `<g transform="translate(${x} ${y}) scale(1.6)"><ellipse cx="-12" cy="-6" rx="10" ry="5" fill="rgba(255,255,255,.75)" transform="rotate(-25 -12 -6)"/><ellipse cx="12" cy="-6" rx="10" ry="5" fill="rgba(255,255,255,.75)" transform="rotate(25 12 -6)"/><circle r="14" fill="${c}" stroke="${INK}" stroke-width="2.5"/><circle cx="-5" cy="2" r="4" fill="#fff" stroke="${INK}" stroke-width="1.5"/><circle cx="5" cy="2" r="4" fill="#fff" stroke="${INK}" stroke-width="1.5"/><circle cx="-5" cy="3" r="1.8" fill="${INK}"/><circle cx="5" cy="3" r="1.8" fill="${INK}"/></g>`).join('')}
    <g fill="#ffc93c"><rect x="185" y="110" width="5" height="18" rx="2"/><rect x="185" y="146" width="5" height="18" rx="2"/><rect x="171" y="128" width="5" height="18" rx="2"/></g>
    <g transform="translate(184 196) scale(2.1)"><path d="M-6 14l6 12 6-12z" fill="#ff5a36"/><path d="M0-20q9 14 18 30l-8 5h-20l-8-5q9-16 18-30z" fill="#ffc93c" stroke="${INK}" stroke-width="2.5"/><ellipse cy="-2" rx="5" ry="8" fill="#bfe8ff" stroke="${INK}" stroke-width="2.5"/></g>`, '#0d0b22'),

  'brick-bash': () => svg('Brick Bash', `
    ${Array.from({ length: 24 }, (_, i) => { const c = i % 6, r = Math.floor(i / 6); const col = ['#ff5da2', '#2ee6c1', '#ffc93c', '#ffc93c'][r]; return (r === 3 && (c === 2 || c === 3)) ? '' : `<rect x="${14 + c * 50}" y="${22 + r * 26}" width="44" height="20" rx="5" fill="${col}" stroke="${INK}" stroke-width="3"/><rect x="${19 + c * 50}" y="${26 + r * 26}" width="34" height="3" fill="rgba(255,255,255,.45)"/>`; }).join('')}
    <g fill="#fff4e0"><circle cx="200" cy="190" r="4" opacity=".25"/><circle cx="188" cy="172" r="5" opacity=".35"/><circle cx="176" cy="154" r="6" opacity=".5"/></g>
    <circle cx="164" cy="134" r="9" fill="#fff4e0" stroke="${INK}" stroke-width="3"/>
    <rect x="160" y="206" width="90" height="16" rx="8" fill="#ffc93c" stroke="${INK}" stroke-width="3"/>
    <g fill="#ffc93c"><path d="M150 108l6-6M168 104l4-8M178 112l8-3" stroke="#ffc93c" stroke-width="3"/></g>`, '#22163f'),

  'snack-merge': () => svg('Snack Merge', `
    <rect x="40" y="20" width="240" height="200" rx="18" fill="#c9b8f0" stroke="${INK}" stroke-width="4"/>
    ${[[0, 0, '#ffd6dc', '4'], [1, 0, '#ffe1a8', '16'], [2, 0, '', ''], [0, 1, '', ''], [1, 1, '#ffc1df', '128'], [2, 1, '#ffe58a', '256'], [0, 2, '#fff4e0', '2'], [1, 2, '', ''], [2, 2, '#ffb07a', '1k']].map(([c, r, col, v]) => `<rect x="${52 + c * 74}" y="${30 + r * 62}" width="68" height="56" rx="12" fill="${col || 'rgba(255,255,255,.35)'}" ${col ? `stroke="${INK}" stroke-width="3"` : ''}/>${v ? `<text x="${86 + c * 74}" y="${74 + r * 62}" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="15" fill="${INK}">${v}</text>` : ''}`).join('')}
    <g transform="translate(160 84)"><circle r="17" fill="#d99a55" stroke="${INK}" stroke-width="3"/><circle r="15" fill="#ff7eb6"/><circle r="6" fill="#2a2142" stroke="${INK}" stroke-width="3"/></g>
    <g transform="translate(234 82) scale(.9)"><path d="M-18 6h36a18 14 0 0 0-36 0z" fill="#f7b733" stroke="${INK}" stroke-width="3"/><path d="M-16 4l4-8 4 6 4-8 4 6 4-8 4 6 4-6" fill="none" stroke="#7bd94a" stroke-width="4"/></g>
    ${cookie(86, 46, 11)}
    <g transform="translate(234 146) scale(.9)"><path d="M-18-2q0-16 18-16t18 16z" fill="#f0a245" stroke="${INK}" stroke-width="3"/><rect x="-19" y="-2" width="38" height="6" fill="#6b3a22" stroke="${INK}" stroke-width="2"/><rect x="-18" y="5" width="36" height="8" rx="4" fill="#f0a245" stroke="${INK}" stroke-width="3"/></g>`, '#fff1dc'),

  'jelly-jump': () => svg('Jelly Jump', `
    <defs><linearGradient id="jjs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fd3ff"/><stop offset="1" stop-color="#d7f2ff"/></linearGradient></defs>
    <rect width="320" height="240" fill="url(#jjs)"/>
    <g fill="#fff" opacity=".8"><ellipse cx="60" cy="50" rx="40" ry="13"/><ellipse cx="86" cy="42" rx="26" ry="12"/><ellipse cx="260" cy="110" rx="44" ry="14"/></g>
    ${[[30, 200, '#e9a95c'], [180, 150, '#4fc3f7'], [70, 104, '#e9a95c'], [220, 58, '#e9c48a']].map(([x, y, c]) => `<rect x="${x}" y="${y}" width="84" height="16" rx="8" fill="${c}" stroke="${INK}" stroke-width="3"/>`).join('')}
    <g transform="translate(140 140) scale(2.2 2.6)"><path d="M-18 14q-2-34 18-34t18 34q-18 4-36 0z" fill="#ff5da2" stroke="${INK}" stroke-width="2.6"/><ellipse cx="-8" cy="-10" rx="5" ry="3.5" fill="rgba(255,255,255,.5)" transform="rotate(-30 -8 -10)"/><circle cx="-5" cy="-2" r="4" fill="#fff" stroke="${INK}" stroke-width="1.5"/><circle cx="7" cy="-2" r="4" fill="#fff" stroke="${INK}" stroke-width="1.5"/><circle cx="-4" cy="-3" r="1.8" fill="${INK}"/><circle cx="8" cy="-3" r="1.8" fill="${INK}"/><path d="M-2 4a3 3 0 0 0 6 0" fill="none" stroke="${INK}" stroke-width="1.6"/></g>
    <g stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"><path d="M118 200v14M140 204v18M162 200v14"/></g>`, '#7fd3ff'),

  'stack-snack': () => svg('Stack Snack', `
    <g stroke="rgba(255,255,255,.6)" stroke-width="2">${Array.from({ length: 8 }, (_, i) => `<path d="M${i * 44} 0v240M0 ${i * 40}h320"/>`).join('')}</g>
    <ellipse cx="160" cy="226" rx="120" ry="14" fill="#fff4e0" stroke="${INK}" stroke-width="3"/>
    <rect x="80" y="196" width="160" height="26" rx="10" fill="#f0a245" stroke="${INK}" stroke-width="3"/>
    ${[['#7bd94a', 72, 0], ['#ffd25e', 86, 6], ['#ef3b55', 80, -4], ['#ffa3b5', 90, 4], ['#7a4529', 84, 0], ['#7bd94a', 92, -2]].map(([c, w, dx], i) => `<rect x="${160 - w + dx}" y="${178 - i * 20}" width="${w * 2}" height="18" rx="6" fill="${c}" stroke="${INK}" stroke-width="3"/>`).join('')}
    <path d="M70 76q0-50 90-52t90 52z" fill="#f0a245" stroke="${INK}" stroke-width="3"/>
    <g fill="#fff4e0">${[[110, 50], [140, 38], [172, 40], [200, 52], [156, 60]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="2.5" transform="rotate(25 ${x} ${y})"/>`).join('')}</g>`, '#bfe8ff'),

  'memory-munch': () => svg('Memory Munch', `
    ${Array.from({ length: 8 }, (_, i) => { const c = i % 4, r = Math.floor(i / 4), x = 22 + c * 72, y = 30 + r * 96, up = i === 1 || i === 6; return `<g transform="rotate(${(i % 3 - 1) * 3} ${x + 32} ${y + 42})"><rect x="${x + 3}" y="${y + 5}" width="64" height="84" rx="12" fill="rgba(21,19,31,.2)"/><rect x="${x}" y="${y}" width="64" height="84" rx="12" fill="${up ? '#fff4e0' : '#ffc93c'}" stroke="${up ? '#ff5da2' : INK}" stroke-width="${up ? 5 : 3}"/>${up ? `<g transform="translate(${x + 32} ${y + 44})"><path d="M-10 6q2-20 14-30M10 8q0-18-6-32" stroke="#4c8a2b" stroke-width="3.5" fill="none"/><circle cx="-10" cy="12" r="11" fill="#e8263f" stroke="${INK}" stroke-width="2.5"/><circle cx="11" cy="14" r="11" fill="#e8263f" stroke="${INK}" stroke-width="2.5"/></g>` : `<text x="${x + 32}" y="${y + 54}" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="30" fill="${INK}">?</text>`}</g>`; }).join('')}`, '#ffe9c7'),

  'dot-boxes': () => svg('Dot Boxes', `
    <g stroke="rgba(51,70,255,.15)" stroke-width="1.5">${Array.from({ length: 11 }, (_, i) => `<path d="M0 ${i * 22 + 10}h320"/>`).join('')}</g><path d="M40 0v240" stroke="rgba(255,90,54,.4)" stroke-width="2"/>
    <rect x="96" y="56" width="52" height="52" fill="rgba(51,70,255,.2)"/><rect x="148" y="108" width="52" height="52" fill="rgba(255,90,54,.22)"/><rect x="200" y="108" width="52" height="52" fill="rgba(255,90,54,.22)"/>
    <g stroke-width="7" stroke-linecap="round">
      <path d="M96 56h52v52H96zM148 56h52" stroke="#3346ff" fill="none"/>
      <path d="M148 108h104v52H148zM200 108v52M252 56v52" stroke="#ff5a36" fill="none"/>
      <path d="M96 160v52" stroke="#3346ff"/></g>
    <g fill="${INK}">${Array.from({ length: 16 }, (_, i) => `<circle cx="${96 + (i % 4) * 52}" cy="${56 + Math.floor(i / 4) * 52}" r="6"/>`).join('')}</g>`, '#fff4e0'),

  'penalty-pop': () => svg('Penalty Pop', `
    <rect width="320" height="70" fill="#121a2e"/>${Array.from({ length: 48 }, (_, i) => `<circle cx="${(i % 16) * 21 + 6 + (Math.floor(i / 16) % 2) * 10}" cy="${14 + Math.floor(i / 16) * 18}" r="6" fill="${['#ff5a36', '#ffc93c', '#2ee6c1', '#ff5da2', '#4fc3f7'][i % 5]}"/>`).join('')}
    <rect y="70" width="320" height="170" fill="#2f8a46"/><g fill="#36984f">${[0, 1, 2, 3].map(i => `<rect y="${84 + i * 40}" width="320" height="20"/>`).join('')}</g>
    <path d="M60 64h200v100H60z" fill="rgba(255,255,255,.1)"/>
    <g stroke="rgba(255,255,255,.35)" stroke-width="1">${Array.from({ length: 14 }, (_, i) => `<path d="M${60 + i * 15} 64v100"/>`).join('')}${Array.from({ length: 8 }, (_, i) => `<path d="M60 ${64 + i * 14}h200"/>`).join('')}</g>
    <path d="M56 168V60h208v108" fill="none" stroke="#fff" stroke-width="8" stroke-linejoin="round"/>
    <g transform="translate(118 116) rotate(-60)"><rect x="-16" y="-20" width="32" height="36" rx="12" fill="#4fc3f7" stroke="${INK}" stroke-width="3"/><circle cy="-34" r="12" fill="#f2c094" stroke="${INK}" stroke-width="3"/><path d="M-12-14l-18-18M12-14l18-18" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><circle cx="-32" cy="-34" r="8" fill="#a6e22e" stroke="${INK}" stroke-width="2.5"/><circle cx="32" cy="-34" r="8" fill="#a6e22e" stroke="${INK}" stroke-width="2.5"/></g>
    <g transform="translate(236 84)"><circle r="13" fill="#fff" stroke="${INK}" stroke-width="3"/><path d="M0-5l5 3-2 6h-6l-2-6z" fill="${INK}"/></g>
    <path d="M160 226Q200 150 228 92" fill="none" stroke="#fff4e0" stroke-width="3" stroke-dasharray="6 8" opacity=".8"/>`, '#2f8a46'),

  'lane-rush': () => svg('Lane Rush', `
    <g fill="#44964f">${[0, 1, 2, 3, 4, 5].map(i => `<rect y="${i * 40}" width="320" height="20"/>`).join('')}</g>
    <rect x="54" y="0" width="212" height="240" fill="${INK}"/><rect x="60" y="0" width="200" height="240" fill="#4a4658"/>
    <g fill="#fff4e0"><rect x="64" width="4" height="240"/><rect x="252" width="4" height="240"/></g>
    <g fill="rgba(255,244,224,.6)">${[110, 160, 210].map(x => [0, 1, 2, 3, 4].map(k => `<rect x="${x - 2}" y="${k * 52 - 10}" width="4" height="28"/>`).join('')).join('')}</g>
    ${car(85, 60, 0, '#ff5a36')}${car(185, 110, 0, '#4fc3f7')}${car(235, 30, 0, '#8e6cf0')}${car(135, 190, 0, '#ffc93c', 1.05)}
    <g fill="rgba(255,201,60,.7)"><rect x="128" y="222" width="5" height="14"/><rect x="138" y="222" width="5" height="18"/></g>
    <g fill="#2f7a3e">${[[24, 40], [296, 120], [26, 170], [294, 220]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16"/>`).join('')}</g>`, '#3d8b4a'),

  'bun-run': () => svg('Bun Run', `
    <defs><linearGradient id="brs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb877"/><stop offset="1" stop-color="#ffe2bd"/></linearGradient></defs>
    <rect width="320" height="240" fill="url(#brs)"/><circle cx="250" cy="60" r="34" fill="rgba(255,244,224,.85)"/>
    <path d="M0 160q60-50 120-20t110-30 90 10v120H0z" fill="#f5a46a"/>
    <rect x="-10" y="176" width="130" height="80" rx="12" fill="#c97b3f" stroke="${INK}" stroke-width="3"/><rect x="-6" y="179" width="122" height="12" rx="6" fill="#f0a245"/>
    <rect x="200" y="150" width="140" height="100" rx="12" fill="#c97b3f" stroke="${INK}" stroke-width="3"/><rect x="204" y="153" width="132" height="12" rx="6" fill="#f0a245"/>
    <g transform="translate(250 150)"><path d="M0 0l2-18h3l1 12 3-12h3l1 12 3-12h3l-2 18z" fill="#cfd3e0" stroke="${INK}" stroke-width="2"/></g>
    <g fill="rgba(255,255,255,.8)"><circle cx="110" cy="120" r="3"/><circle cx="96" cy="130" r="2.5"/></g>
    <g transform="translate(150 96) scale(2)"><path d="M-6 16l-4 7M6 16l5 6" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M-20 8q0-24 20-24t20 24q-20 6-40 0z" fill="#f0a245" stroke="${INK}" stroke-width="2.5"/><rect x="-18" y="8" width="36" height="4" fill="#7bd94a"/><path d="M-18 12h36q0 6-18 6t-18-6z" fill="#e8963a" stroke="${INK}" stroke-width="2.5"/><g fill="#fff4e0"><ellipse cx="-9" cy="-8" rx="2.5" ry="1.4"/><ellipse cx="1" cy="-12" rx="2.5" ry="1.4"/><ellipse cx="9" cy="-6" rx="2.5" ry="1.4"/></g><circle cx="4" cy="1" r="3.6" fill="#fff" stroke="${INK}" stroke-width="1.5"/><circle cx="13" cy="1" r="3.6" fill="#fff" stroke="${INK}" stroke-width="1.5"/><circle cx="5" cy="1" r="1.8" fill="${INK}"/><circle cx="14" cy="1" r="1.8" fill="${INK}"/></g>
    ${[[200, 110, '#e8263f'], [228, 100, '#e8263f'], [256, 106, '#e8263f']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="7" fill="${c}" stroke="${INK}" stroke-width="2"/>`).join('')}`, '#ffd8a8'),

  'snack-attack': () => svg('Snack Attack', `
    <g fill="#322a4b">${Array.from({ length: 30 }, (_, i) => `<rect x="${(i % 7) * 50 + (Math.floor(i / 7) % 2) * 25 - 10}" y="${Math.floor(i / 7) * 50}" width="25" height="25"/>`).join('')}</g>
    ${gummy(60, 60, 2, 'rgba(255,90,54,.9)')}${gummy(260, 70, 2.2, 'rgba(46,230,193,.9)')}${gummy(70, 190, 1.8, 'rgba(142,108,240,.9)')}${gummy(270, 190, 2.6, 'rgba(255,201,60,.9)')}
    <g fill="#ffc93c" stroke="${INK}" stroke-width="1.5"><circle cx="196" cy="94" r="5"/><circle cx="216" cy="84" r="5"/><circle cx="112" cy="160" r="5"/></g>
    <g transform="translate(160 128) scale(2.3)"><circle r="15" fill="#ffc93c" stroke="${INK}" stroke-width="2.5"/><rect x="-9" y="-22" width="18" height="9" rx="3" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="-5" cy="-24" r="6" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="5" cy="-24" r="6" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cy="-28" r="6" fill="#fff" stroke="${INK}" stroke-width="2"/><rect x="-8" y="-21" width="16" height="7" fill="#fff"/><circle cx="-1" cy="-1" r="2.4" fill="${INK}"/><circle cx="7" cy="-2" r="2.4" fill="${INK}"/><path d="M10-6l14-8" stroke="#cfd3e0" stroke-width="4" stroke-linecap="round"/></g>`, '#2b2440'),
  'night-shift': () => svg('Night Shift', `
    <defs><radialGradient id="nsb" cx="0.1" cy="0.95" r="1"><stop offset="0" stop-color="#ffd68c" stop-opacity=".75"/><stop offset=".6" stop-color="#ffd68c" stop-opacity=".18"/><stop offset="1" stop-color="#ffd68c" stop-opacity="0"/></radialGradient></defs>
    <g fill="#1c1a24"><rect x="20" y="40" width="46" height="150"/><rect x="250" y="20" width="52" height="170"/></g>
    <path d="M58 214L330 70V250H120z" fill="url(#nsb)"/>
    <g fill="#3a3546"><rect x="150" y="70" width="70" height="110"/></g><g fill="#8a6a3a"><rect x="158" y="84" width="22" height="16"/><rect x="186" y="110" width="26" height="16"/><rect x="160" y="140" width="20" height="16"/></g>
    <g transform="translate(262 116)"><path d="M-26 50Q-34-40 0-46Q34-40 26 50l-8-10-8 10-10-10-10 10-8-10z" fill="#05040a"/><circle cx="-10" cy="-18" r="6" fill="#ff3b3b"/><circle cx="10" cy="-18" r="6" fill="#ff3b3b"/><path d="M-16-2l4 8 4-8 4 8 4-8 4 8 4-8 4 8" fill="none" stroke="#e9e2d0" stroke-width="3" stroke-linejoin="round"/></g>
    <g transform="translate(62 208)"><circle r="13" fill="#ffc93c" stroke="#000" stroke-width="3"/><rect x="-13" y="-5" width="26" height="5" fill="#4fc3f7"/><rect x="8" y="-14" width="14" height="8" rx="2" fill="#cfd3e0" stroke="#000" stroke-width="2" transform="rotate(-28)"/></g>`, '#050409'),

  'candle-call': () => svg('Candle Call', `
    <ellipse cx="160" cy="70" rx="58" ry="66" fill="#d8d0ff" opacity=".14"/><ellipse cx="140" cy="60" rx="10" ry="15" fill="#0d0716" opacity=".5"/><ellipse cx="180" cy="60" rx="10" ry="15" fill="#0d0716" opacity=".5"/>
    <ellipse cx="160" cy="176" rx="150" ry="62" fill="#3b2018" stroke="#5a3324" stroke-width="4"/>
    <rect x="102" y="152" width="116" height="50" rx="12" fill="#c9a66b" stroke="#6b4a2b" stroke-width="3"/>
    <text x="160" y="182" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="700" font-size="12" fill="rgba(59,32,24,.75)">A B C D E F G H</text>
    ${[[52, 150, '#ffb347'], [100, 118, '#ff6b9d'], [220, 118, '#9d7bff'], [268, 150, '#4fc3f7'], [90, 222, '#7cffb2'], [230, 222, '#ffe66b']].map(([x, y, c]) => `<circle cx="${x}" cy="${y - 34}" r="26" fill="${c}" opacity=".28"/><rect x="${x - 9}" y="${y - 24}" width="18" height="30" rx="4" fill="#efe6d2" stroke="${INK}" stroke-width="2.5"/><path d="M${x} ${y - 26}q-7-8 0-22q7 14 0 22z" fill="${c}"/><ellipse cx="${x}" cy="${y - 30}" rx="2.5" ry="4" fill="#fff8e0"/>`).join('')}`, '#0d0716'),

  'snack-shack': () => svg('Snack Shack', `
    <rect width="320" height="130" fill="#bfe8ff"/><rect y="110" width="320" height="30" fill="#9ad4a0"/>
    ${Array.from({ length: 8 }, (_, i) => `<path d="M${i * 40} 0h40v18q-20 18-40 0z" fill="${i % 2 ? '#fff4e0' : '#ff5a36'}"/>`).join('')}
    <g transform="translate(110 92)"><path d="M-30 50Q-34-10 0-12Q34-10 30 50z" fill="#2ee6c1" stroke="${INK}" stroke-width="3"/><circle cx="-9" cy="8" r="5" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="9" cy="8" r="5" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="-8" cy="9" r="2.2" fill="${INK}"/><circle cx="10" cy="9" r="2.2" fill="${INK}"/><path d="M-6 22a6 6 0 0 0 12 0" fill="none" stroke="${INK}" stroke-width="2.5"/></g>
    <g transform="translate(180 30)"><rect x="0" y="0" width="96" height="48" rx="12" fill="#fff" stroke="${INK}" stroke-width="3"/><path d="M14 48l-6 12 16-12z" fill="#fff" stroke="${INK}" stroke-width="3"/>
      <g transform="translate(30 24)"><path d="M-14 0q0-12 14-12t14 12z" fill="#f0a245" stroke="${INK}" stroke-width="2"/><rect x="-15" y="0" width="30" height="5" fill="#6b3a22"/><rect x="-14" y="5" width="28" height="6" rx="3" fill="#f0a245" stroke="${INK}" stroke-width="2"/></g>
      <g transform="translate(68 24)"><circle r="13" fill="#d99a55" stroke="${INK}" stroke-width="2"/><circle r="11" fill="#ff7eb6"/><circle r="4" fill="#2a2142" stroke="${INK}" stroke-width="2"/></g></g>
    <rect y="140" width="320" height="22" fill="#c97b3f"/><rect y="140" width="320" height="6" fill="#e9a95c"/>
    <rect y="162" width="320" height="78" fill="#2a2140"/>
    <rect x="22" y="176" width="130" height="56" rx="10" fill="#4a4658" stroke="${INK}" stroke-width="3"/><circle cx="60" cy="204" r="18" fill="rgba(0,0,0,.35)" stroke="${INK}" stroke-width="2"/><circle cx="114" cy="204" r="18" fill="rgba(0,0,0,.35)" stroke="${INK}" stroke-width="2"/>
    <g transform="translate(60 204) scale(.8)"><path d="M-14 0q0-12 14-12t14 12z" fill="#f0a245"/><rect x="-15" y="0" width="30" height="5" fill="#6b3a22"/></g>
    <path d="M114 186a18 18 0 0 1 18 18" fill="none" stroke="#2ee6c1" stroke-width="5"/>
    <rect x="168" y="176" width="130" height="56" rx="10" fill="#ff9ccf" stroke="${INK}" stroke-width="3"/><g transform="translate(233 204)"><circle r="16" fill="#d99a55" stroke="${INK}" stroke-width="2.5"/><circle r="13" fill="#ff7eb6"/><circle r="5" fill="#2a2142" stroke="${INK}" stroke-width="2"/></g>`, '#bfe8ff'),

  'sprout-patch': () => svg('Sprout Patch', `
    <g fill="#86cf80">${Array.from({ length: 24 }, (_, i) => `<rect x="${(i % 6) * 60 + (Math.floor(i / 6) % 2) * 30}" y="${Math.floor(i / 6) * 60}" width="30" height="30"/>`).join('')}</g>
    <rect x="18" y="28" width="284" height="196" rx="18" fill="#5b3a20"/>
    ${[[28, 38, .9], [124, 38, .5], [220, 38, .2], [28, 134, .3], [124, 134, .8], [220, 134, .6]].map(([x, y, w]) => `<rect x="${x}" y="${y}" width="86" height="80" rx="10" fill="rgb(${150 - w * 60},${100 - w * 40},${60 - w * 25})" stroke="${INK}" stroke-width="2.5"/>`).join('')}
    <g transform="translate(71 80)"><path d="M0 0l-10-20M0 0l0-24M0 0l10-20" stroke="#3e8e2a" stroke-width="5" stroke-linecap="round"/><path d="M-10 0h20l-10 22z" fill="#ff8a2a" stroke="${INK}" stroke-width="2"/></g>
    <g transform="translate(167 182)"><path d="M-26 6q26-30 52 0" fill="none" stroke="#3e8e2a" stroke-width="4"/><ellipse cy="6" rx="24" ry="19" fill="#f28c28" stroke="${INK}" stroke-width="2.5"/><path d="M0-13v38M-12-11q-6 17 0 34M12-11q6 17 0 34" stroke="rgba(21,19,31,.35)" stroke-width="2" fill="none"/><rect x="-2" y="-20" width="4" height="8" fill="#5b3420"/></g>
    <g transform="translate(263 176)">${[[-12, -6], [12, -6], [0, -16], [-6, 4], [8, 4]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="11" ry="7" fill="#4caf50"/>`).join('')}${[[-10, 2], [8, -2], [0, 9]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#ef3b3b" stroke="${INK}" stroke-width="1.5"/>`).join('')}</g>
    <g transform="translate(176 66)"><ellipse rx="16" ry="11" fill="#1b1530"/><path d="M-4-2l-20-12 18 18M4-2l20-12-18 18" fill="#1b1530"/><circle cx="12" cy="-8" r="7" fill="#1b1530"/><circle cx="14" cy="-9" r="2" fill="#fff"/><path d="M18-8l9 3-9 3z" fill="#ffc93c"/></g>
    <g fill="#7bd94a"><circle cx="252" cy="88" r="5"/><circle cx="260" cy="84" r="5"/><path d="M256 96v-10" stroke="#3e8e2a" stroke-width="3"/></g>`, '#7cc576'),
};
