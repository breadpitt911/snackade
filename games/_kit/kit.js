/* Snackbar game kit: the boring bits every built-in game needs, in one place.
 * Canvas that scales to fit, keyboard / mouse / multi-touch input, tiny synth sound effects,
 * text, particles, screen shake, pause handling, best scores, immediate-mode buttons and a
 * set of hand-drawn snacks. Served by the play host at /kit/kit.js.
 *
 *   const K = Kit({ W: 800, H: 450 });
 *   K.run(dt => { ...update... }, () => { ...draw... });
 */
(function () {
  'use strict';
  var INK = '#1b1530';
  window.Kit = function (o) {
    var W = o.W, H = o.H;
    var cv = document.createElement('canvas');
    document.body.appendChild(cv);
    var ctx = cv.getContext('2d');
    function fit() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2), s = Math.min(innerWidth / W, innerHeight / H);
      cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px';
      cv.width = Math.round(W * s * dpr); cv.height = Math.round(H * s * dpr);
      ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    }
    addEventListener('resize', fit); fit();

    var K = {
      W: W, H: H, ctx: ctx, cv: cv, t: 0, paused: false, muted: false, playing: false,
      FONT: '"Bricolage Grotesque", system-ui, sans-serif',
      C: { ink: INK, cream: '#fff4e0', lemon: '#ffc93c', tomato: '#ff5a36', mint: '#2ee6c1', cobalt: '#3346ff', gum: '#ff5da2', sky: '#4fc3f7', grape: '#8e6cf0', lime: '#a6e22e', night: '#15131f' },
      touch: matchMedia('(pointer: coarse)').matches,
    };

    // ---------- math ----------
    K.rnd = function (a, b) { return a + Math.random() * (b - a); };
    K.irnd = function (a, b) { return Math.floor(K.rnd(a, b + 1)); };
    K.pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };
    K.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
    K.lerp = function (a, b, t) { return a + (b - a) * t; };
    K.dist = function (ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); };
    K.angDiff = function (a, b) { var d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
    K.ease = function (t) { return 1 - Math.pow(1 - K.clamp(t, 0, 1), 3); };
    K.back = function (t) { t = K.clamp(t, 0, 1); var c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

    // ---------- keyboard ----------
    var down = new Set(), hit = new Set();
    var BLOCK = /^(Arrow|Space$|Enter$|Key[A-Z]$|Digit|Slash$|Period$|Comma$|Shift|Tab$)/;
    addEventListener('keydown', function (e) {
      if (BLOCK.test(e.code)) e.preventDefault();
      unlock();
      if (e.repeat) { down.add(e.code); return; }
      if (e.code === 'KeyM') { K.muted = !K.muted; return; }
      if ((e.code === 'Escape' || e.code === 'KeyP') && K.playing) { K.paused = !K.paused; down.clear(); return; }
      if (K.paused) { if (e.code === 'KeyQ' && K.onQuit) quit(); else K.paused = false; return; }
      down.add(e.code); hit.add(e.code);
    });
    addEventListener('keyup', function (e) { down.delete(e.code); });
    function quit() { K.paused = false; K.playing = false; ptrs.clear(); down.clear(); K.clearParts && K.clearParts(); if (K.onQuit) K.onQuit(); }
    function autoPause() { down.clear(); ptrs.clear(); if (K.playing) K.paused = true; }
    addEventListener('blur', autoPause);
    if (window.Snackbar) Snackbar.onPause(autoPause);
    K.key = function () { for (var i = 0; i < arguments.length; i++) if (down.has(arguments[i])) return true; return false; };
    K.hit = function () { for (var i = 0; i < arguments.length; i++) if (hit.has(arguments[i])) return true; return false; };
    K.anyHit = function () { return hit.size > 0; };

    // ---------- pointer / touch ----------
    var ptrs = new Map(), taps = [], releases = [], pauseTaps = [];
    // Touch players get a small pause button at the bottom middle while a game is running.
    var CHIP = { w: 46, h: 30 };
    function inPauseChip(p) { return Math.abs(p.x - W / 2) < CHIP.w / 2 + 6 && p.y > H - CHIP.h - 14; }
    K.mouse = null;
    function pos(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
    cv.addEventListener('pointerdown', function (e) {
      e.preventDefault(); unlock();
      var p = pos(e); K.mouse = p;
      if (K.paused) { pauseTaps.push(p); return; }
      if (K.touch && K.playing && inPauseChip(p)) { K.paused = true; ptrs.clear(); return; }
      ptrs.set(e.pointerId, { x: p.x, y: p.y, x0: p.x, y0: p.y, t0: K.t, id: e.pointerId });
      taps.push({ x: p.x, y: p.y, id: e.pointerId });
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    });
    cv.addEventListener('pointermove', function (e) { var p = pos(e); K.mouse = p; var q = ptrs.get(e.pointerId); if (q) { q.x = p.x; q.y = p.y; } });
    function up(e) { var q = ptrs.get(e.pointerId); if (q) { var p = pos(e); releases.push({ x: p.x, y: p.y, x0: q.x0, y0: q.y0, dt: K.t - q.t0 }); } ptrs.delete(e.pointerId); }
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    K.pointers = function () { return Array.from(ptrs.values()); };
    K.taps = function () { return taps; };
    K.tapped = function () { return taps.length > 0; };
    // A finished swipe this frame: 'left' | 'right' | 'up' | 'down' | null
    K.swipe = function (min) {
      for (var i = 0; i < releases.length; i++) {
        var r = releases[i], dx = r.x - r.x0, dy = r.y - r.y0;
        if (Math.max(Math.abs(dx), Math.abs(dy)) >= (min || 24)) return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      }
      return null;
    };
    K.swipeIn = function (zone, min) {
      for (var i = 0; i < releases.length; i++) {
        var r = releases[i], dx = r.x - r.x0, dy = r.y - r.y0;
        if (r.x0 < zone.x || r.x0 > zone.x + zone.w || r.y0 < zone.y || r.y0 > zone.y + zone.h) continue;
        if (Math.max(Math.abs(dx), Math.abs(dy)) >= (min || 24)) return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      }
      return null;
    };
    // A quick tap (short, barely moved) that started inside the zone and ended this frame.
    K.quickTap = function (zone) {
      return releases.some(function (r) { return r.dt < .3 && Math.hypot(r.x - r.x0, r.y - r.y0) < 16 && r.x0 >= zone.x && r.x0 <= zone.x + zone.w && r.y0 >= zone.y && r.y0 <= zone.y + zone.h; });
    };
    K.LEFT = { x: 0, y: 0, w: W / 2, h: H }; K.RIGHT = { x: W / 2, y: 0, w: W / 2, h: H };
    // Virtual stick: the first pointer that started inside the zone, as {dx, dy} in -1..1, or null.
    K.stick = function (zone, radius) {
      radius = radius || 50;
      var ps = K.pointers();
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i];
        if (p.x0 >= zone.x && p.x0 <= zone.x + zone.w && p.y0 >= zone.y && p.y0 <= zone.y + zone.h) {
          var dx = (p.x - p.x0) / radius, dy = (p.y - p.y0) / radius, m = Math.hypot(dx, dy);
          if (m > 1) { dx /= m; dy /= m; }
          return { dx: dx, dy: dy, x0: p.x0, y0: p.y0, x: p.x, y: p.y };
        }
      }
      return null;
    };
    K.held = function (zone) { return K.pointers().some(function (p) { return p.x >= zone.x && p.x <= zone.x + zone.w && p.y >= zone.y && p.y <= zone.y + zone.h; }); };
    K.tappedIn = function (zone) { return taps.some(function (p) { return p.x >= zone.x && p.x <= zone.x + zone.w && p.y >= zone.y && p.y <= zone.y + zone.h; }); };

    // ---------- sound ----------
    var actx = null;
    function unlock() {
      try {
        if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
        else if (actx.state === 'suspended') actx.resume();
      } catch (_) {}
    }
    K.sfx = function (f, dur, type, vol, slide) {
      if (K.muted || !actx) return;
      dur = dur || .1;
      try {
        var t = actx.currentTime, osc = actx.createOscillator(), g = actx.createGain();
        osc.type = type || 'triangle'; osc.frequency.setValueAtTime(f, t);
        if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + dur);
        g.gain.setValueAtTime(vol || .06, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
        osc.connect(g).connect(actx.destination); osc.start(t); osc.stop(t + dur + .02);
      } catch (_) {}
    };
    var noiseBuf = null;
    K.noise = function (dur, vol, freq) {
      if (K.muted || !actx) return;
      try {
        if (!noiseBuf) { noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate); var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
        var t = actx.currentTime, s = actx.createBufferSource(), g = actx.createGain(), f = actx.createBiquadFilter();
        s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = freq || 1200;
        g.gain.setValueAtTime(vol || .1, t); g.gain.exponentialRampToValueAtTime(.0001, t + (dur || .3));
        s.connect(f).connect(g).connect(actx.destination); s.start(t); s.stop(t + (dur || .3));
      } catch (_) {}
    };
    K.jingle = function (notes, step, type, vol) {
      notes.forEach(function (f, i) { setTimeout(function () { K.sfx(f, .16, type || 'square', vol || .035); }, i * (step || 90)); });
    };

    // ---------- drawing ----------
    K.rr = function (x, y, w, h, r) {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
      else { ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    };
    K.circle = function (x, y, r, fill, stroke, lw) {
      ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
    };
    K.text = function (s, x, y, size, col, align, weight, shadow) {
      ctx.font = (weight || 800) + ' ' + (size || 20) + 'px ' + K.FONT;
      ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
      if (shadow !== false) { ctx.fillStyle = shadow || 'rgba(21,19,31,.5)'; ctx.fillText(s, x + Math.max(1, size / 18), y + Math.max(1.5, size / 14)); }
      ctx.fillStyle = col || '#fff'; ctx.fillText(s, x, y);
    };
    K.keycap = function (x, y, label, w) {
      w = w || Math.max(26, label.length * 9 + 14);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; K.rr(x - w / 2 + 2, y - 13 + 3, w, 26, 6); ctx.fill();
      ctx.fillStyle = K.C.cream; K.rr(x - w / 2, y - 13, w, 26, 6); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      K.text(label, x, y + 1, 13, INK, 'center', 800, false);
      return w;
    };
    // Text on a dark pill, readable on any background.
    K.banner = function (s, x, y, size, col) {
      ctx.font = '800 ' + size + 'px ' + K.FONT;
      var w = ctx.measureText(s).width + size * 1.4;
      ctx.fillStyle = 'rgba(21,19,31,.78)'; K.rr(x - w / 2, y - size * .8, w, size * 1.6, size * .5); ctx.fill();
      K.text(s, x, y + 1, size, col || K.C.cream);
    };
    // Immediate-mode button. Draws itself and returns true on the frame it's clicked/tapped.
    K.button = function (x, y, w, h, label, opts) {
      opts = opts || {};
      var over = K.mouse && K.mouse.x > x && K.mouse.x < x + w && K.mouse.y > y && K.mouse.y < y + h;
      var tapped = taps.some(function (p) { return p.x > x && p.x < x + w && p.y > y && p.y < y + h; });
      var lift = over && !K.touch ? 2 : 0;
      ctx.fillStyle = INK; K.rr(x + 4, y + 4, w, h, 12); ctx.fill();
      ctx.fillStyle = opts.bg || K.C.lemon; K.rr(x - lift, y - lift, w, h, 12); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
      K.text(label, x + w / 2 - lift, y + h / 2 - lift + 1, opts.size || 20, opts.fg || INK, 'center', 800, false);
      if (opts.key && !K.touch) { ctx.globalAlpha = .6; K.text(opts.key, x + w - 9 - lift, y + 11 - lift, 10, opts.fg || INK, 'right', 800, false); ctx.globalAlpha = 1; }
      if (tapped) K.sfx(660, .06, 'square', .03);
      return tapped;
    };

    // ---------- particles & shake ----------
    var parts = [], shake = 0;
    K.burst = function (x, y, n, cols, speed, life, size, grav) {
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, v = (speed || 160) * (.3 + Math.random() * .7);
        parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: (life || .6) * (.6 + Math.random() * .4), max: life || .6, c: cols[i % cols.length], r: (size || 3) * (.6 + Math.random() * .6), g: grav || 0 });
      }
    };
    K.drawParts = function () {
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i]; ctx.globalAlpha = Math.min(1, p.life / p.max * 1.6);
        ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    K.clearParts = function () { parts.length = 0; };
    K.shake = function (v) { shake = Math.max(shake, v); };

    // ---------- best scores ----------
    K.best = function (k) { try { return +localStorage.getItem('snk-' + k) || 0; } catch (_) { return 0; } };
    K.saveBest = function (k, v) { if (v > K.best(k)) { try { localStorage.setItem('snk-' + k, v); } catch (_) {} return true; } return false; };
    K.submit = function (score) { if (window.Snackbar && score > 0) Snackbar.gameOver(Math.floor(score)); };

    // ---------- loop ----------
    K.run = function (update, draw) {
      var last = performance.now();
      var errors = 0;
      function frame(now) {
        requestAnimationFrame(frame);   // first, so one bad frame can't stop the game
        // rAF timestamps can be a touch older than performance.now(), so never go backwards
        var dt = Math.max(0, Math.min(1 / 30, (now - last) / 1000)); last = Math.max(last, now);
        try {
          if (!K.paused) {
            K.t += dt; update(dt);
            for (var i = parts.length - 1; i >= 0; i--) { var p = parts[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.vx *= .985; p.life -= dt; if (p.life <= 0) parts.splice(i, 1); }
            shake = Math.max(0, shake - dt * 2.5);
          }
          ctx.save();
          if (shake > 0) ctx.translate((Math.random() - .5) * 24 * shake, (Math.random() - .5) * 24 * shake);
          draw();
        } catch (e) { if (errors++ < 3) console.error(e); }
        ctx.restore();
        if (K.paused) {
          ctx.fillStyle = 'rgba(21,19,31,.78)'; ctx.fillRect(0, 0, W, H);
          K.text('Paused', W / 2, H / 2 - 70, 50, K.C.cream);
          var saved = taps; taps = pauseTaps;
          var bw = Math.min(220, W * .42), y = H / 2 - 22;
          if (K.button(W / 2 - bw / 2, y, bw, 52, 'Keep playing', { key: K.touch ? '' : 'Enter' })) K.paused = false;
          if (K.onQuit && K.button(W / 2 - bw / 2, y + 66, bw, 52, 'Quit to menu', { bg: K.C.cream, key: K.touch ? '' : 'Q' })) quit();
          taps = saved; pauseTaps = [];
        } else if (K.touch && K.playing) {
          ctx.globalAlpha = .55; ctx.fillStyle = 'rgba(21,19,31,.8)'; K.rr(W / 2 - CHIP.w / 2, H - CHIP.h - 8, CHIP.w, CHIP.h, 10); ctx.fill();
          ctx.fillStyle = '#fff4e0'; ctx.fillRect(W / 2 - 6, H - CHIP.h + 1, 4, 12); ctx.fillRect(W / 2 + 2, H - CHIP.h + 1, 4, 12); ctx.globalAlpha = 1;
        }
        hit.clear(); taps = []; releases = []; pauseTaps = [];
      }
      requestAnimationFrame(frame);
      if (window.Snackbar) Snackbar.ready();
    };

    // ---------- snacks (hand-drawn, outline style) ----------
    function ol(s) { ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, s * .09); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
    function dot(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
    var SNACKS = {
      crumb: function (s) {
        [[-.45, .2, .42, .3], [.35, .3, .36, -.4], [.05, -.4, .3, 1.1]].forEach(function (c) {
          ctx.save(); ctx.translate(c[0] * s, c[1] * s); ctx.rotate(c[3]);
          ctx.beginPath(); var r = c[2] * s; ctx.moveTo(-r, -r * .3); ctx.lineTo(-r * .2, -r); ctx.lineTo(r, -r * .4); ctx.lineTo(r * .7, r * .8); ctx.lineTo(-r * .6, r * .7); ctx.closePath();
          ctx.fillStyle = '#e9a95c'; ctx.fill(); ol(s * .7); dot(0, 0, r * .25, '#5b3420'); ctx.restore();
        });
      },
      cookie: function (s) {
        ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fillStyle = '#e9a95c'; ctx.fill(); ol(s);
        [[-.4, -.35], [.35, -.3], [.05, .1], [-.35, .4], [.45, .35], [-.05, -.65]].forEach(function (p) { dot(p[0] * s, p[1] * s, s * .13, '#5b3420'); });
      },
      donut: function (s) {
        ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fillStyle = '#d99a55'; ctx.fill(); ol(s);
        ctx.beginPath();
        for (var i = 0; i <= 16; i++) { var a = i / 16 * Math.PI * 2, r = s * (.84 + (i % 2) * .08); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        ctx.closePath(); ctx.fillStyle = '#ff7eb6'; ctx.fill();
        ctx.beginPath(); ctx.arc(0, 0, s * .32, 0, Math.PI * 2); ctx.fillStyle = '#2a2142'; ctx.fill(); ol(s);
        var cs = ['#fff4e0', '#4fc3f7', '#ffc93c', '#2ee6c1'];
        for (var j = 0; j < 9; j++) { var b = j * 2.4, rr = s * (.5 + (j % 3) * .1); ctx.save(); ctx.translate(Math.cos(b) * rr, Math.sin(b) * rr); ctx.rotate(b * 2); ctx.fillStyle = cs[j % 4]; ctx.fillRect(-s * .1, -s * .03, s * .2, s * .06); ctx.restore(); }
      },
      cherry: function (s) {
        ctx.beginPath(); ctx.moveTo(-s * .4, s * .2); ctx.quadraticCurveTo(-s * .3, -s * .6, s * .15, -s * .9); ctx.moveTo(s * .45, s * .3); ctx.quadraticCurveTo(s * .4, -s * .4, s * .15, -s * .9);
        ctx.strokeStyle = '#4c8a2b'; ctx.lineWidth = s * .1; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(s * .38, -s * .85, s * .28, s * .13, -.4, 0, Math.PI * 2); ctx.fillStyle = '#7bd94a'; ctx.fill(); ol(s * .7);
        [[-.4, .45], [.45, .52]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0] * s, p[1] * s, s * .45, 0, Math.PI * 2); ctx.fillStyle = '#e8263f'; ctx.fill(); ol(s); dot(p[0] * s - s * .15, p[1] * s - s * .15, s * .1, 'rgba(255,255,255,.7)'); });
      },
      pizza: function (s) {
        ctx.beginPath(); ctx.moveTo(0, s); ctx.lineTo(-s * .9, -s * .6); ctx.quadraticCurveTo(0, -s * 1.05, s * .9, -s * .6); ctx.closePath(); ctx.fillStyle = '#ffd25e'; ctx.fill(); ol(s);
        ctx.beginPath(); ctx.moveTo(-s * .9, -s * .6); ctx.quadraticCurveTo(0, -s * 1.05, s * .9, -s * .6); ctx.lineWidth = s * .25; ctx.strokeStyle = '#c9782f'; ctx.stroke();
        [[0, -.25], [-.3, -.4], [.32, -.38], [.05, .3]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0] * s, p[1] * s, s * .14, 0, Math.PI * 2); ctx.fillStyle = '#d6313e'; ctx.fill(); });
      },
      taco: function (s) {
        ctx.beginPath(); ctx.moveTo(-s, s * .4);
        for (var i = 0; i <= 8; i++) ctx.lineTo(-s + i * s / 4, s * .4 - s * .5 - (i % 2) * s * .18);
        ctx.lineTo(s, s * .4); ctx.closePath(); ctx.fillStyle = '#7bd94a'; ctx.fill(); ol(s);
        [[-.45, -.25], [.1, -.32], [.5, -.2]].forEach(function (p) { dot(p[0] * s, p[1] * s, s * .14, '#e8263f'); });
        ctx.beginPath(); ctx.ellipse(0, s * .45, s, s * .75, 0, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fillStyle = '#f7b733'; ctx.fill(); ol(s);
        ctx.beginPath(); ctx.ellipse(0, s * .45, s * .75, s * .5, 0, Math.PI * 1.15, Math.PI * 1.85); ctx.strokeStyle = 'rgba(160,90,20,.5)'; ctx.lineWidth = s * .07; ctx.stroke();
      },
      burger: function (s) {
        ctx.beginPath(); ctx.moveTo(-s, -s * .1); ctx.quadraticCurveTo(-s, -s, 0, -s); ctx.quadraticCurveTo(s, -s, s, -s * .1); ctx.closePath(); ctx.fillStyle = '#f0a245'; ctx.fill(); ol(s);
        [[-.4, -.6], [.1, -.75], [.45, -.45], [-.1, -.4]].forEach(function (p) { ctx.fillStyle = '#fff4e0'; ctx.beginPath(); ctx.ellipse(p[0] * s, p[1] * s, s * .08, s * .04, .4, 0, Math.PI * 2); ctx.fill(); });
        ctx.beginPath(); ctx.moveTo(-s * 1.05, 0); for (var i = 0; i <= 6; i++) ctx.lineTo(-s * 1.05 + i * s * .35, (i % 2) * s * .18); ctx.lineTo(s * 1.05, 0); ctx.lineTo(s * 1.05, -s * .1); ctx.lineTo(-s * 1.05, -s * .1); ctx.closePath(); ctx.fillStyle = '#7bd94a'; ctx.fill(); ol(s * .8);
        K.rr(-s * .98, s * .08, s * 1.96, s * .32, s * .15); ctx.fillStyle = '#6b3a22'; ctx.fill(); ol(s);
        K.rr(-s * .95, s * .45, s * 1.9, s * .4, s * .18); ctx.fillStyle = '#f0a245'; ctx.fill(); ol(s);
      },
      icecream: function (s) {
        ctx.beginPath(); ctx.moveTo(-s * .55, -s * .05); ctx.lineTo(0, s * 1.05); ctx.lineTo(s * .55, -s * .05); ctx.closePath(); ctx.fillStyle = '#e9a95c'; ctx.fill(); ol(s);
        ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(120,70,20,.5)'; ctx.lineWidth = s * .06; for (var i = -3; i < 4; i++) { ctx.beginPath(); ctx.moveTo(i * s * .3 - s, -s * .1); ctx.lineTo(i * s * .3 + s, s * 1.1); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i * s * .3 + s, -s * .1); ctx.lineTo(i * s * .3 - s, s * 1.1); ctx.stroke(); } ctx.restore();
        ctx.beginPath(); ctx.arc(0, -s * .35, s * .62, Math.PI * .9, Math.PI * 2.1); ctx.quadraticCurveTo(s * .3, s * .05, 0, -s * .05); ctx.quadraticCurveTo(-s * .3, s * .1, -s * .62, -s * .2); ctx.closePath(); ctx.fillStyle = '#ff9ccf'; ctx.fill(); ol(s);
        dot(s * .05, -s * 1.02, s * .17, '#e8263f');
      },
      cake: function (s) {
        K.rr(-s * .9, -s * .3, s * 1.8, s * 1.1, s * .12); ctx.fillStyle = '#ffe1b8'; ctx.fill(); ol(s);
        ctx.fillStyle = '#ff7eb6'; ctx.fillRect(-s * .88, s * .2, s * 1.76, s * .16);
        ctx.beginPath(); ctx.moveTo(-s * .9, -s * .3); for (var i = 0; i <= 6; i++) ctx.quadraticCurveTo(-s * .9 + (i - .5) * s * .3, s * .05, -s * .9 + i * s * .3, -s * .3); ctx.lineTo(s * .9, -s * .45); ctx.lineTo(-s * .9, -s * .45); ctx.closePath(); ctx.fillStyle = '#ff7eb6'; ctx.fill(); ol(s * .8);
        ctx.fillStyle = '#4fc3f7'; ctx.fillRect(-s * .07, -s, s * .14, s * .55); ctx.strokeStyle = INK; ctx.lineWidth = s * .06; ctx.strokeRect(-s * .07, -s, s * .14, s * .55);
        ctx.beginPath(); ctx.ellipse(0, -s * 1.12, s * .1, s * .17, 0, 0, Math.PI * 2); ctx.fillStyle = '#ffc93c'; ctx.fill();
      },
      candy: function (s) {
        [-1, 1].forEach(function (d) { ctx.beginPath(); ctx.moveTo(d * s * .45, 0); ctx.lineTo(d * s, -s * .45); ctx.lineTo(d * s, s * .45); ctx.closePath(); ctx.fillStyle = '#8e6cf0'; ctx.fill(); ol(s * .8); });
        ctx.beginPath(); ctx.arc(0, 0, s * .52, 0, Math.PI * 2); ctx.fillStyle = '#b39dff'; ctx.fill(); ol(s);
        ctx.save(); ctx.clip(); ctx.strokeStyle = '#fff4e0'; ctx.lineWidth = s * .14; for (var i = -2; i < 3; i++) { ctx.beginPath(); ctx.moveTo(i * s * .32 - s * .5, -s * .6); ctx.lineTo(i * s * .32 + s * .5, s * .6); ctx.stroke(); } ctx.restore();
        ctx.beginPath(); ctx.arc(0, 0, s * .52, 0, Math.PI * 2); ol(s);
      },
      watermelon: function (s) {
        ctx.beginPath(); ctx.arc(0, -s * .35, s, 0, Math.PI); ctx.closePath(); ctx.fillStyle = '#3aa655'; ctx.fill(); ol(s);
        ctx.beginPath(); ctx.arc(0, -s * .35, s * .82, 0, Math.PI); ctx.closePath(); ctx.fillStyle = '#ff4f6d'; ctx.fill();
        [[-.45, .05], [0, .25], [.45, .05], [-.2, -.1], [.22, -.08]].forEach(function (p) { ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(p[0] * s, p[1] * s, s * .05, s * .09, 0, 0, Math.PI * 2); ctx.fill(); });
      },
      chili: function (s) {
        ctx.beginPath(); ctx.moveTo(-s * .6, -s * .55); ctx.bezierCurveTo(s * .4, -s * .7, s * 1.1, 0, s * .4, s * .95); ctx.bezierCurveTo(s * .55, s * .2, -s * .1, -s * .1, -s * .75, -s * .2); ctx.closePath(); ctx.fillStyle = '#e8263f'; ctx.fill(); ol(s);
        ctx.beginPath(); ctx.moveTo(-s * .65, -s * .4); ctx.quadraticCurveTo(-s * .95, -s * .55, -s * .85, -s * .95); ctx.strokeStyle = '#4c8a2b'; ctx.lineWidth = s * .14; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-s * .2, -s * .45); ctx.quadraticCurveTo(s * .3, -s * .45, s * .5, -s * .1); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = s * .09; ctx.stroke();
      },
      berry: function (s) {
        ctx.beginPath(); ctx.moveTo(0, s); ctx.bezierCurveTo(-s * 1.1, s * .1, -s * .9, -s * .75, 0, -s * .6); ctx.bezierCurveTo(s * .9, -s * .75, s * 1.1, s * .1, 0, s); ctx.fillStyle = '#ef3b55'; ctx.fill(); ol(s);
        for (var i = 0; i < 8; i++) { var x = ((i * 37) % 9 - 4) / 6 * s, y = (((i * 53) % 7) / 7 - .2) * s; ctx.fillStyle = '#ffe78a'; ctx.beginPath(); ctx.ellipse(x * .9, y, s * .04, s * .07, 0, 0, Math.PI * 2); ctx.fill(); }
        ctx.beginPath(); for (var j = 0; j < 5; j++) { var a = Math.PI + j / 4 * Math.PI; ctx.lineTo(Math.cos(a) * s * .45, -s * .62 + Math.sin(a) * s * .25); ctx.lineTo(Math.cos(a + .3) * s * .15, -s * .62); } ctx.closePath(); ctx.fillStyle = '#4caf50'; ctx.fill(); ol(s * .6);
      },
      pretzel: function (s) {
        ctx.beginPath(); ctx.moveTo(-s * .25, s * .7); ctx.bezierCurveTo(-s * 1.3, s * .1, -s * .9, -s * 1.1, 0, -s * .3); ctx.bezierCurveTo(s * .9, -s * 1.1, s * 1.3, s * .1, s * .25, s * .7);
        ctx.moveTo(-s * .5, s * .8); ctx.lineTo(s * .35, -s * .1); ctx.moveTo(s * .5, s * .8); ctx.lineTo(-s * .35, -s * .1);
        ctx.strokeStyle = INK; ctx.lineWidth = s * .42; ctx.stroke(); ctx.strokeStyle = '#b8682b'; ctx.lineWidth = s * .28; ctx.stroke();
        [[-.6, -.3], [.6, -.3], [0, .35], [-.7, .25]].forEach(function (p) { ctx.fillStyle = '#fff4e0'; ctx.fillRect(p[0] * s, p[1] * s, s * .08, s * .08); });
      },
    };
    K.SNACKS = Object.keys(SNACKS);
    K.snack = function (name, x, y, s, rot) {
      if (!SNACKS[name]) return;
      ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
      SNACKS[name](s);
      ctx.restore();
    };
    return K;
  };
})();
