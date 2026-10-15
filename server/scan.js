// Automatic checks on every uploaded game. Runs in the background after the upload goes live.
//  1. A local scan of the game's HTML/JS for known-bad patterns (crypto miners, password
//     prompts, attempts to take over the page) and a list of other sites it loads from.
//  2. Optional: every outside URL (and hosted-game links) checked against Google's list of
//     malware and phishing sites. Set SAFE_BROWSING_KEY (free, non-commercial use) or
//     WEB_RISK_KEY (Google Cloud Web Risk, free up to 100k lookups a month, OK for commercial use).
// Anything found lands in the admin Reports queue. Near-certain hits (miners, Google-listed
// malware) are taken down straight away; the admin can put them back.
import fs from 'node:fs';
import path from 'node:path';
import { config, storageDir } from './config.js';
import { one, run, now } from './db.js';

const TEXT = /\.(html?|m?js|json|txt|css)$/i;
const MAX_FILE = 6 * 1024 * 1024, MAX_TOTAL = 60 * 1024 * 1024, MAX_FILES = 3000;

const RULES = [
  { id: 'miner', severe: true, label: 'Crypto-mining code',
    re: /coinhive|coin-hive\.com|CoinHive\.(Anonymous|User)|cryptonight(_hash)?\.wasm|webminepool|coinimp\.com|crypto-?loot|jsecoin\.com|minero\.cc|webmine\.(cz|pro)|deepMiner|monerominer|wasmminer|cryptonoter/i },
  { id: 'password', severe: false, label: 'Asks for a password',
    re: /<input[^>]+type\s*=\s*["']?password/i },
  { id: 'toplevel', severe: false, label: 'Tries to redirect the whole page',
    re: /\b(window\.)?top\.location(\.href)?\s*=(?!=)|\btop\.location\.(replace|assign)\s*\(|\bparent\.location(\.href)?\s*=(?!=)/ },
  { id: 'wallet', severe: false, label: 'Mentions crypto wallets or seed phrases',
    re: /seed phrase|recovery phrase|private key.{0,40}wallet|wallet.{0,40}private key/i },
];
// Hosts every game loads from that aren't worth listing.
const BORING = /(^|\.)(w3\.org|schema\.org|example\.(com|org)|localhost|github\.com|githubusercontent\.com|mozilla\.org|wikipedia\.org|unity3d\.com|unity\.com|creativecommons\.org|apache\.org|opensource\.org|jquery\.(com|org))$/i;

function* files(dir) {
  const stack = [dir];
  let n = 0;
  while (stack.length) {
    const d = stack.pop();
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile() && TEXT.test(e.name)) { if (++n > MAX_FILES) return; yield p; }
    }
  }
}

export function scanDir(dir) {
  const hits = new Map(), hosts = new Set();
  let total = 0;
  for (const f of files(dir)) {
    const size = fs.statSync(f).size;
    if (size > MAX_FILE || (total += size) > MAX_TOTAL) continue;
    const text = fs.readFileSync(f, 'utf8');
    const rel = path.relative(dir, f);
    for (const r of RULES) if (!hits.has(r.id) && r.re.test(text)) hits.set(r.id, { ...r, file: rel });
    for (const m of text.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})(?::\d+)?(?=[/"'`\s)?#]|$)/gi)) {
      const h = m[1].toLowerCase();
      if (!BORING.test(h) && hosts.size < 200) hosts.add(h);
    }
  }
  return { hits: [...hits.values()], hosts: [...hosts].sort() };
}

// Google lookups. Returns the URLs Google lists as dangerous (empty if no key is set).
async function googleCheck(urls) {
  urls = [...new Set(urls)].slice(0, 200);
  if (!urls.length) return [];
  const types = ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'];
  const ctl = AbortSignal.timeout(15000);
  if (process.env.SAFE_BROWSING_KEY) {
    const r = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(process.env.SAFE_BROWSING_KEY)}`, {
      method: 'POST', signal: ctl, headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ client: { clientId: config.siteName.toLowerCase(), clientVersion: '1' },
        threatInfo: { threatTypes: types, platformTypes: ['ANY_PLATFORM'], threatEntryTypes: ['URL'], threatEntries: urls.map(url => ({ url })) } }),
    });
    if (!r.ok) throw new Error(`Safe Browsing said ${r.status}`);
    return [...new Set(((await r.json()).matches || []).map(m => m.threat.url))];
  }
  if (process.env.WEB_RISK_KEY) {
    const bad = [];
    for (const url of urls.slice(0, 25)) {   // one call per URL, so keep it modest
      const q = new URLSearchParams({ uri: url, key: process.env.WEB_RISK_KEY });
      types.slice(0, 3).forEach(t => q.append('threatTypes', t));
      const r = await fetch(`https://webrisk.googleapis.com/v1/uris:search?${q}`, { signal: ctl });
      if (!r.ok) throw new Error(`Web Risk said ${r.status}`);
      if ((await r.json()).threat) bad.push(url);
    }
    return bad;
  }
  return [];
}
export const googleEnabled = () => !!(process.env.SAFE_BROWSING_KEY || process.env.WEB_RISK_KEY);

// Scan one game and act on what's found. Safe to call again (e.g. a rescan from the admin page).
export async function checkGame(gameId, log = console.log) {
  const g = one('SELECT * FROM games WHERE id=?', gameId);
  if (!g || g.kind === 'builtin') return null;
  const dir = path.join(storageDir, g.slug);
  const local = g.kind === 'embed' ? { hits: [], hosts: [new URL(g.entry).hostname] } : fs.existsSync(dir) ? scanDir(dir) : { hits: [], hosts: [] };
  let flagged = [];
  try { flagged = await googleCheck([...(g.kind === 'embed' ? [g.entry] : []), ...local.hosts.map(h => `https://${h}/`)]); }
  catch (e) { log(`scan: Google check failed for ${g.slug}: ${e.message}`); }

  run('UPDATE games SET ext_hosts=? WHERE id=?', local.hosts.join(','), g.id);
  const findings = [...local.hits.map(h => `${h.label} (in ${h.file})`), ...flagged.map(u => `Google lists ${u} as unsafe`)];
  if (!findings.length) return { ok: true, hosts: local.hosts };

  const severe = local.hits.some(h => h.severe) || flagged.length > 0;
  const t = now();
  run(`INSERT INTO reports (kind, game_id, snapshot, reason, details, source, created_at) VALUES ('game',?,?,?,?, 'auto', ?)`,
    g.id, g.title, 'malware', `Automatic check found:\n- ${findings.join('\n- ')}${severe ? '\n\nTaken down automatically. Use "Put it back live" if this is a false alarm.' : ''}`, t);
  if (severe) run("UPDATE games SET status='hidden', taken_down=1, featured=0, updated_at=? WHERE id=?", t, g.id);
  log(`scan: ${g.slug} flagged${severe ? ' and taken down' : ''}: ${findings.join('; ')}`);
  return { ok: false, severe, findings, hosts: local.hosts };
}
