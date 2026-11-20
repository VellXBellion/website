// index.js - backend 4VELL (tanpa dependency, butuh Node 18+)
// Jalankan: node index.js
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/* ───────── Config: isi lewat file .env atau environment variable ───────── */
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/).forEach(l => {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch (_) {}
const PORT = Number(process.env.PORT) || 3000;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '';     // token bot BARU dari @BotFather
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''; // chat id tujuan notifikasi
const TRUST_PROXY = process.env.TRUST_PROXY === '1';         // set 1 kalau di belakang proxy/hosting
const PUBLIC_DIR = path.join(__dirname, 'public'); // aset statis: css, js
const VIEWS_DIR = path.join(__dirname, 'views');   // potongan HTML (tidak bisa diakses langsung dari luar)
const PROD = process.env.NODE_ENV === 'production';

/* ───────── Helper umum ───────── */
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp' };
const SEC = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN', 'Referrer-Policy': 'strict-origin-when-cross-origin' };
const send = (res, code, obj) => { res.writeHead(code, { ...SEC, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
const clientIP = req => (TRUST_PROXY && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || 'unknown';
// Origin frontend yang boleh memanggil API ini (mis. situs Netlify), pisahkan dengan koma
const ALLOWED = (process.env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim().replace(/\/$/, '')).filter(Boolean);
function sameOrigin(req) {
  const o = req.headers.origin || req.headers.referer;
  if (!o) return true;
  try { const u = new URL(o); return u.host === req.headers.host || ALLOWED.includes(u.origin); } catch (_) { return false; }
}
function applyCors(req, res) {
  const o = req.headers.origin;
  if (o && ALLOWED.includes(o)) {
    res.setHeader('Access-Control-Allow-Origin', o);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
}
const buckets = new Map();
function limited(key, max, windowMs) {
  const now = Date.now(); let b = buckets.get(key);
  if (!b || now > b.reset) { b = { n: 0, reset: now + windowMs }; buckets.set(key, b); }
  return ++b.n > max;
}
setInterval(() => { const n = Date.now(); for (const [k, b] of buckets) if (n > b.reset) buckets.delete(k); }, 60000).unref();
function readBody(req, max = 4096) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > max) { reject(new Error('Body terlalu besar')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/* ───────── /api/notify : proxy Telegram (token tidak pernah keluar dari server) ───────── */
async function handleNotify(req, res) {
  if (req.method !== 'POST') return send(res, 405, { ok: false });
  if (!sameOrigin(req)) return send(res, 403, { ok: false, message: 'Forbidden' });
  if (limited('n:' + clientIP(req), 30, 60000)) return send(res, 429, { ok: false, message: 'Terlalu banyak request' });
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return send(res, 503, { ok: false, message: 'Telegram belum dikonfigurasi' });
  let text;
  try { text = String(JSON.parse(await readBody(req)).text || '').slice(0, 1500); } catch (_) { return send(res, 400, { ok: false }); }
  if (!text) return send(res, 400, { ok: false });
  try {
    const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' })
    });
    return send(res, 200, { ok: r.ok });
  } catch (_) { return send(res, 502, { ok: false }); }
}

/* ───────── /api/preset : Preset Finder (port dari scraper amfind.js) ───────── */
const AMF = 'https://amfinder.web.id';
const AMF_HS = AMF + '/api/v/7f91a2e4';
const AMF_HEADERS = {
  'Content-Type': 'application/json', 'Accept': '*/*',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Origin': AMF, 'Referer': AMF + '/preset/tiktok/ZSbQn3Sys',
  'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
  'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"', 'sec-ch-ua-mobile': '?1', 'sec-ch-ua-platform': '"Android"'
};
const AMF_ENV = { c: -787480068, sw: 360, sh: 806, cd: 24, dpr: 2, tz: 'Asia/Jakarta', tzo: -420, hc: 8, mtp: 2, w: true, d: true };
function amfProof(saltHex, msg, rounds) {
  const salt = Buffer.from(saltHex, 'hex'); let data = Buffer.from(msg, 'utf8');
  const n = Math.max(1, Math.min(100000, Math.floor(Number(rounds) || 1)));
  for (let i = 0; i < n; i++) data = crypto.createHmac('sha256', salt).update(data).digest();
  return data.toString('hex');
}
async function amfToken() {
  const did = crypto.randomUUID();
  const r1 = await fetch(AMF_HS, { method: 'POST', headers: AMF_HEADERS, body: JSON.stringify({ did }) });
  if (!r1.ok) throw new Error('Handshake 1 HTTP ' + r1.status);
  const { cid, salt, ts, rounds } = await r1.json();
  if (!cid || !salt || !ts) throw new Error('Challenge tidak lengkap');
  const E = AMF_ENV;
  const bsig = crypto.createHash('sha256').update(`${cid}|${salt}|${E.c}|${E.sw}x${E.sh}|${E.cd}|${E.tz}|${E.tzo}|${E.hc}`, 'utf8').digest('hex');
  const proof = amfProof(salt, `${cid}|${did}|${ts}|${bsig}`, rounds);
  const r2 = await fetch(AMF_HS, { method: 'POST', headers: AMF_HEADERS, body: JSON.stringify({ cid, did, ts, proof, bsig, env: E, score: 0, reasons: [] }) });
  if (!r2.ok) throw new Error('Handshake 2 HTTP ' + r2.status);
  const j = await r2.json();
  if (!j.token) throw new Error('Token tidak valid');
  return j.token;
}
function amfParse(raw, isUrl) {
  let ev = 'message', cands = [], fin = null;
  for (let l of raw.split(/\r?\n/)) {
    l = l.trim(); if (!l) continue;
    if (l.startsWith('event:')) ev = l.slice(6).trim();
    else if (l.startsWith('data:')) {
      const d = l.slice(5).trim(); let p = d; try { p = JSON.parse(d); } catch (_) {}
      if (ev === 'candidates' && p && Array.isArray(p.items)) cands = p.items;
      else if (ev === 'result') fin = p;
    }
  }
  if (fin && typeof fin === 'object') return isUrl ? fin : (cands.length ? { total: cands.length, items: cands } : fin);
  if (!isUrl && cands.length) return { total: cands.length, items: cands };
  return null;
}
async function handlePreset(req, res, url) {
  if (req.method !== 'GET') return send(res, 405, { status: false });
  if (!sameOrigin(req)) return send(res, 403, { status: false, message: 'Forbidden' });
  if (limited('p:' + clientIP(req), 10, 60000)) return send(res, 429, { status: false, message: 'Terlalu banyak request, coba lagi nanti' });
  const q = (url.searchParams.get('q') || '').trim().slice(0, 500);
  if (!q) return send(res, 400, { status: false, message: 'Parameter q kosong' });
  const isUrl = /^https?:\/\//i.test(q);
  try {
    const t = await amfToken();
    const u = isUrl
      ? `${AMF}/api/find?url=${encodeURIComponent(q)}&bat=46&chg=0&t=${encodeURIComponent(t)}`
      : `${AMF}/api/search?mode=pick&q=${encodeURIComponent(q)}&t=${encodeURIComponent(t)}`;
    const r = await fetch(u, { headers: { ...AMF_HEADERS, Accept: 'text/event-stream' }, signal: AbortSignal.timeout(65000) });
    if (!r.ok) throw new Error('Query HTTP ' + r.status);
    const parsed = amfParse(await r.text(), isUrl);
    if (!parsed) return send(res, 502, { status: false, message: 'Gagal memparsing hasil' });
    return send(res, 200, { status: true, result: parsed });
  } catch (e) { return send(res, 502, { status: false, message: e.message }); }
}

/* ───────── Perakit halaman: <!--#include file.html--> ───────── */
let pageCache = null;
function assemble(rel, depth = 0) {
  if (depth > 5) throw new Error('Include terlalu dalam');
  const file = path.normalize(path.join(VIEWS_DIR, rel));
  if (!file.startsWith(VIEWS_DIR + path.sep)) throw new Error('Path include tidak valid');
  return fs.readFileSync(file, 'utf8').replace(/<!--#include (\S+?)-->/g, (_, f) => assemble(f, depth + 1));
}
function servePage(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { ok: false });
  try {
    if (!PROD || !pageCache) pageCache = assemble('index.html');
    res.writeHead(200, { ...SEC, 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : pageCache);
  } catch (e) { console.error(e); send(res, 500, { ok: false, message: 'Gagal memuat halaman' }); }
}

/* ───────── Static files ───────── */
function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { ok: false });
  let rel; try { rel = decodeURIComponent(pathname); } catch (_) { return send(res, 400, { ok: false }); }
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 403, { ok: false });
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, { ok: false, message: 'Not found' });
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { ...SEC, 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600' });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
}

/* ───────── Server ───────── */
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    applyCors(req, res);
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  }
  if (url.pathname === '/api/notify') return handleNotify(req, res);
  if (url.pathname === '/api/preset') return handlePreset(req, res, url);
  if (url.pathname.startsWith('/api/')) return send(res, 404, { ok: false });
  if (url.pathname === '/' || url.pathname === '/index.html') return servePage(req, res);
  serveStatic(req, res, url.pathname);
}).listen(PORT, () => console.log('Server jalan di port ' + PORT));
