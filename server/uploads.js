// Turns whatever someone uploads (a zip, one HTML file, a GitHub repo, a Unity
// WebGL build or a hosted URL) into a folder under data/games/<slug>/ with a
// known entry file. Everything is served later from the separate games origin.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import AdmZip from 'adm-zip';
import { config, storageDir } from './config.js';
import { one } from './db.js';

export class UploadError extends Error { constructor(msg) { super(msg); this.status = 400; } }

export const KINDS = ['html5', 'html', 'github', 'unity', 'embed'];
export const CATEGORIES = ['arcade', 'action', 'shooter', 'puzzle', 'racing', 'sports', 'platformer', 'strategy', 'casual', 'multiplayer'];

export function slugify(s) {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'game';
}
export function uniqueSlug(title) {
  const base = slugify(title);
  let slug = base, i = 2;
  while (one('SELECT 1 FROM games WHERE slug=?', slug) || fs.existsSync(path.join(storageDir, slug))) slug = `${base}-${i++}`;
  return slug;
}

const JUNK = /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db|\.git)(\/|$)/;

// Extract a zip safely: no paths escaping the folder, size and file-count caps.
export function extractZip(buffer, dest) {
  let zip;
  try { zip = new AdmZip(buffer); } catch { throw new UploadError("That file isn't a zip we can open. Try zipping it again."); }
  const entries = zip.getEntries();
  if (entries.length > config.limits.entries) throw new UploadError(`That zip has way too many files (max ${config.limits.entries}).`);
  const tooBig = () => new UploadError(`Unzipped, that's over ${config.limits.unzipped / 1048576} MB. Trim it down a bit.`);
  // Check declared sizes up front so obvious zip bombs never get decompressed.
  let declared = 0;
  for (const e of entries) {
    if (e.isDirectory) continue;
    declared += e.header.size;
    if (declared > config.limits.unzipped) throw tooBig();
    if (e.header.compressedSize > 0 && e.header.size / e.header.compressedSize > 1000 && e.header.size > 50e6) throw new UploadError('Nice try. That zip unpacks to something enormous.');
  }
  let total = 0, written = 0;
  const root = path.resolve(dest) + path.sep;
  for (const e of entries) {
    const name = e.entryName.replace(/\\/g, '/');
    if (e.isDirectory || JUNK.test(name)) continue;
    const target = path.resolve(dest, name);
    if (!target.startsWith(root)) throw new UploadError('The zip has a file trying to escape its folder. Not happening.');
    let data;
    try { data = e.getData(); } catch { throw new UploadError(`Couldn't unpack "${name}". The zip might be damaged.`); }
    total += data.length;                          // real size, in case the header lied
    if (total > config.limits.unzipped) throw tooBig();
    try {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, data);
    } catch { throw new UploadError(`The zip has a file/folder name clash at "${name}".`); }
    written++;
  }
  if (!written) throw new UploadError('That zip is empty.');
}

function walk(dir, base = dir, out = []) {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) walk(p, base, out); else out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}
const depth = p => p.split('/').length;
const dirSize = dir => walk(dir).reduce((n, f) => n + fs.statSync(path.join(dir, f)).size, 0);

// Pick the page that starts the game: prefer index.html in common build folders, shallowest first.
function findEntry(files, preferDirs = ['', 'dist/', 'build/', 'docs/', 'public/', 'www/', 'web/']) {
  for (const d of preferDirs) if (files.includes(d + 'index.html')) return d + 'index.html';
  const idx = files.filter(f => /(^|\/)index\.html?$/i.test(f)).sort((a, b) => depth(a) - depth(b));
  if (idx.length) return idx[0];
  const html = files.filter(f => /\.html?$/i.test(f)).sort((a, b) => depth(a) - depth(b));
  return html[0] || null;
}

// Unity WebGL: use the exported index.html when present, otherwise write our own loader page.
function prepareUnity(dir) {
  const files = walk(dir);
  const loader = files.find(f => /\.loader\.js$/i.test(f));
  const legacyLoader = files.find(f => /(^|\/)UnityLoader\.js$/i.test(f));
  if (!loader && !legacyLoader) throw new UploadError("That doesn't look like a Unity WebGL build (no Build/*.loader.js in there). Zip the whole WebGL output folder and try again.");
  const existing = findEntry(files);
  if (existing) return existing;

  let page;
  if (loader) {
    const b = loader.replace(/\.loader\.js$/i, '');
    const pick = (re) => files.find(f => f.startsWith(b) && re.test(f.slice(b.length)));
    const data = pick(/^\.data(\.br|\.gz|\.unityweb)?$/i), fw = pick(/^\.framework\.js(\.br|\.gz|\.unityweb)?$/i), code = pick(/^\.wasm(\.br|\.gz|\.unityweb)?$/i);
    if (!data || !fw || !code) throw new UploadError('The Unity build is missing its .data, .framework.js or .wasm file.');
    page = unityPage(`<script src="${loader}"></script>`, `createUnityInstance(c, { dataUrl: "${data}", frameworkUrl: "${fw}", codeUrl: "${code}", streamingAssetsUrl: "StreamingAssets", companyName: "", productName: "" }, p => bar.style.width = (p * 100) + '%')`);
  } else {
    const json = files.find(f => f.endsWith('.json') && path.dirname(f) === path.dirname(legacyLoader));
    if (!json) throw new UploadError('Old-style Unity build, but its .json file is missing.');
    page = unityPage(`<script src="${legacyLoader}"></script>`, `new Promise(r => UnityLoader.instantiate(c, "${json}", { onProgress: (_, p) => { bar.style.width = (p * 100) + '%'; if (p >= 1) r(); } }))`);
  }
  fs.writeFileSync(path.join(dir, 'index.html'), page);
  return 'index.html';
}
const unityPage = (scriptTag, call) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#unity-canvas{width:100%;height:100%;display:block}
#load{position:fixed;left:50%;top:50%;width:220px;height:10px;margin:-5px 0 0 -110px;background:#222;border-radius:9px;overflow:hidden}#bar{height:100%;width:0;background:#ffc93c}</style>
</head><body><canvas id="unity-canvas" tabindex="-1"></canvas><div id="load"><div id="bar"></div></div>
${scriptTag}<script>const c=document.getElementById('unity-canvas'),bar=document.getElementById('bar');
(${call}).then(()=>document.getElementById('load').remove()).catch(e=>{document.getElementById('load').outerHTML='<p style="color:#fff;font:16px sans-serif;text-align:center;margin-top:40vh">'+e+'</p>'});</script></body></html>`;

// ---- GitHub -------------------------------------------------------------
export function parseGithubUrl(input) {
  const m = String(input || '').trim().match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/tree\/([^/]+)(?:\/(.+?))?)?\/?$/i);
  if (!m) throw new UploadError('That needs to be a GitHub repo link, like https://github.com/you/your-game');
  return { owner: m[1], repo: m[2], branch: m[3] || null, subdir: (m[4] || '').replace(/\/+$/, '') };
}

async function fetchCapped(url, max, headers = {}) {
  const res = await fetch(url, { headers: { 'user-agent': 'snackade-importer', ...headers }, redirect: 'follow' });
  if (res.status === 404) throw new UploadError("GitHub can't find that repo or branch. Double-check the link (private repos won't work).");
  if (res.status === 401 || res.status === 403 || res.status === 429) throw new UploadError('GitHub said no. The repo might be private, or we hit their rate limit. Give it a few minutes.');
  if (!res.ok) throw new UploadError(`GitHub had a moment (error ${res.status}). Try again in a bit.`);
  const chunks = []; let n = 0;
  for await (const c of res.body) { n += c.length; if (n > max) throw new UploadError('That repo is too big to import.'); chunks.push(c); }
  return Buffer.concat(chunks);
}

async function downloadGithub({ owner, repo, branch }) {
  const auth = config.githubToken ? { authorization: `Bearer ${config.githubToken}` } : {};
  if (!branch) {
    const meta = await fetchCapped(`https://api.github.com/repos/${owner}/${repo}`, 1e6, { accept: 'application/vnd.github+json', ...auth });
    branch = JSON.parse(meta).default_branch || 'main';
  }
  const zip = await fetchCapped(`https://api.github.com/repos/${owner}/${repo}/zipball/${encodeURIComponent(branch)}`, config.limits.zip, auth);
  return { zip, branch };
}

// ---- main entry ----------------------------------------------------------
// opts: { kind, slug, file: {buffer, originalname}, repoUrl, branch, subdir, embedUrl }
export async function processUpload(opts) {
  const { kind, slug } = opts;
  if (!KINDS.includes(kind)) throw new UploadError('Pick how your game is packaged first.');

  if (kind === 'embed') {
    let u;
    try { u = new URL(opts.embedUrl); } catch { throw new UploadError("That link doesn't look right."); }
    if (u.protocol !== 'https:') throw new UploadError('Hosted games need an https:// link.');
    return { kind, entry: u.href, sourceUrl: u.href, sizeBytes: 0 };
  }

  const tmp = path.join(storageDir, `.tmp-${crypto.randomBytes(6).toString('hex')}`);
  fs.mkdirSync(tmp, { recursive: true });
  try {
    let entry, sourceUrl = null, root = tmp;

    if (kind === 'html') {
      if (!opts.file) throw new UploadError('You forgot the .html file.');
      if (!/\.html?$/i.test(opts.file.originalname)) throw new UploadError('Single-file games have to be a .html file.');
      fs.writeFileSync(path.join(tmp, 'index.html'), opts.file.buffer);
      entry = 'index.html';
    }

    if (kind === 'html5' || kind === 'unity') {
      if (!opts.file) throw new UploadError('You forgot the .zip file.');
      if (!/\.zip$/i.test(opts.file.originalname)) throw new UploadError('Zip up the build and upload the .zip.');
      extractZip(opts.file.buffer, tmp);
      root = collapseSingleFolder(tmp);
      if (kind === 'unity') entry = prepareUnity(root);
      else {
        entry = findEntry(walk(root));
        if (!entry) throw new UploadError("Couldn't find an index.html in that zip. That's the file we start the game from.");
      }
    }

    if (kind === 'github') {
      const gh = parseGithubUrl(opts.repoUrl);
      const branch = (opts.branch || '').trim() || gh.branch;
      const subdir = ((opts.subdir || '').trim() || gh.subdir).replace(/^\/+|\/+$/g, '');
      const { zip, branch: used } = await downloadGithub({ ...gh, branch });
      extractZip(zip, tmp);
      root = collapseSingleFolder(tmp);          // GitHub wraps everything in owner-repo-sha/
      if (subdir) {
        root = path.resolve(root, subdir);
        if (!root.startsWith(tmp) || !fs.existsSync(root)) throw new UploadError(`There's no "${subdir}" folder in that repo.`);
      }
      const files = walk(root);
      const isUnity = files.some(f => /\.loader\.js$/i.test(f) || /UnityLoader\.js$/.test(f));
      entry = isUnity ? prepareUnity(root) : findEntry(files);
      if (!entry) {
        const needsBuild = files.includes('package.json');
        throw new UploadError(needsBuild
          ? 'No index.html in there. This repo looks like it needs building first. Commit the built folder (like dist/) or point us at it.'
          : "Couldn't find an index.html in that repo.");
      }
      sourceUrl = `https://github.com/${gh.owner}/${gh.repo}/tree/${used}${subdir ? '/' + subdir : ''}`;
    }

    const final = path.join(storageDir, slug);
    fs.renameSync(root, final);
    return { kind, entry, sourceUrl, sizeBytes: dirSize(final) };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// If a zip holds a single top-level folder (very common), use that folder as the root.
function collapseSingleFolder(dir) {
  let cur = dir;
  for (;;) {
    const items = fs.readdirSync(cur, { withFileTypes: true });
    if (items.length === 1 && items[0].isDirectory()) cur = path.join(cur, items[0].name); else return cur;
  }
}

export function removeGameFiles(slug) {
  const p = path.join(storageDir, slug);
  if (p.startsWith(storageDir + path.sep)) fs.rmSync(p, { recursive: true, force: true });
}
