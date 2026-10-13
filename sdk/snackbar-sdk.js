/* Snackbar game SDK — injected automatically into every game served by Snackbar.
 * Games don't need to do anything to run, but can call:
 *   Snackbar.submitScore(1234)   → posts to the game's leaderboard (signed-in players earn XP)
 *   Snackbar.ready()             → tells the site loading is done
 *   Snackbar.onPause(fn)         → called when the player leaves the tab / opens a menu
 * Hosted (embed) games can load this file from the games origin to get the same API.
 * The same object is also available as SnackbarGames (use that if your game already has its own
 * "Snackbar" UI library) and as Snackade (the old name, kept so older games keep working).
 */
(function () {
  if (window.__snackbarSdk) return;
  var SITE = '__SITE_ORIGIN__';
  var target = window.parent !== window ? window.parent : null;
  var pauseFns = [], resumeFns = [];
  function send(type, data) {
    if (!target) return;
    var msg = { source: 'snackbar', type: type };
    for (var k in data) msg[k] = data[k];
    try { target.postMessage(msg, SITE); } catch (e) { /* wrong origin in dev — ignore */ }
  }
  window.addEventListener('message', function (e) {
    if (e.origin !== SITE || !e.data || e.data.source !== 'snackbar-site') return;
    if (e.data.type === 'pause') pauseFns.forEach(function (f) { f(); });
    if (e.data.type === 'resume') resumeFns.forEach(function (f) { f(); });
  });
  var sdk = {
    submitScore: function (score) { score = Math.floor(Number(score)); if (score >= 0) send('score', { score: score }); },
    gameOver: function (score) { if (score != null) this.submitScore(score); send('gameover', {}); },
    ready: function () { send('ready', {}); },
    onPause: function (f) { pauseFns.push(f); },
    onResume: function (f) { resumeFns.push(f); },
    embedded: !!target,
  };
  window.__snackbarSdk = window.Snackbar = window.SnackbarGames = window.Snackade = sdk;
})();
