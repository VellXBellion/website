// Netlify Function - Preset Finder backend (port dari scraper amfind.js)
const crypto = require('crypto');

const BASE = 'https://amfinder.web.id';
const HS = BASE + '/api/v/7f91a2e4';
const HEADERS = {
  'Content-Type': 'application/json',
  'Accept': '*/*',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Origin': BASE,
  'Referer': BASE + '/preset/tiktok/ZSbQn3Sys',
  'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
  'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
  'sec-ch-ua-mobile': '?1',
  'sec-ch-ua-platform': '"Android"'
};
const ENV = { c: -787480068, sw: 360, sh: 806, cd: 24, dpr: 2, tz: 'Asia/Jakarta', tzo: -420, hc: 8, mtp: 2, w: true, d: true };

function proof(saltHex, msg, rounds) {
  const salt = Buffer.from(saltHex, 'hex');
  let data = Buffer.from(msg, 'utf8');
  const n = Math.max(1, Math.min(100000, Math.floor(Number(rounds) || 1)));
  for (let i = 0; i < n; i++) data = crypto.createHmac('sha256', salt).update(data).digest();
  return data.toString('hex');
}
async function getToken() {
  const did = crypto.randomUUID();
  const r1 = await fetch(HS, { method: 'POST', headers: HEADERS, body: JSON.stringify({ did }) });
  if (!r1.ok) throw new Error('Handshake 1 HTTP ' + r1.status);
  const { cid, salt, ts, rounds } = await r1.json();
  if (!cid || !salt || !ts) throw new Error('Challenge tidak lengkap');
  const raw = `${cid}|${salt}|${ENV.c}|${ENV.sw}x${ENV.sh}|${ENV.cd}|${ENV.tz}|${ENV.tzo}|${ENV.hc}`;
  const bsig = crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
  const pr = proof(salt, `${cid}|${did}|${ts}|${bsig}`, rounds);
  const r2 = await fetch(HS, { method: 'POST', headers: HEADERS, body: JSON.stringify({ cid, did, ts, proof: pr, bsig, env: ENV, score: 0, reasons: [] }) });
  if (!r2.ok) throw new Error('Handshake 2 HTTP ' + r2.status);
  const j = await r2.json();
  if (!j.token) throw new Error('Token tidak valid');
  return j.token;
}
function parseSse(raw, isUrl) {
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
const reply = (o, s = 200) => ({ statusCode: s, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(o) });

const hits = new Map();
function limited(ip, max, ms) {
  const now = Date.now(); let b = hits.get(ip);
  if (!b || now > b.reset) { b = { n: 0, reset: now + ms }; hits.set(ip, b); }
  return ++b.n > max;
}
function sameOrigin(h) {
  const o = h.origin || h.referer;
  if (!o) return true;
  try { return new URL(o).host === h.host; } catch (_) { return false; }
}
exports.handler = async (event) => {
  const h = event.headers || {};
  if (!sameOrigin(h)) return reply({ status: false, message: 'Forbidden' }, 403);
  if (limited(h['x-nf-client-connection-ip'] || 'x', 10, 60000)) return reply({ status: false, message: 'Terlalu banyak request, coba lagi nanti' }, 429);
  const q = ((event.queryStringParameters || {}).q || '').trim().slice(0, 500);
  if (!q) return reply({ status: false, message: 'Parameter q kosong' }, 400);
  const isUrl = /^https?:\/\//i.test(q);
  try {
    const t = await getToken();
    const u = isUrl
      ? `${BASE}/api/find?url=${encodeURIComponent(q)}&bat=46&chg=0&t=${encodeURIComponent(t)}`
      : `${BASE}/api/search?mode=pick&q=${encodeURIComponent(q)}&t=${encodeURIComponent(t)}`;
    const r = await fetch(u, { headers: { ...HEADERS, Accept: 'text/event-stream' } });
    if (!r.ok) throw new Error('Query HTTP ' + r.status);
    const parsed = parseSse(await r.text(), isUrl);
    if (!parsed) return reply({ status: false, message: 'Gagal memparsing hasil' }, 502);
    return reply({ status: true, result: parsed });
  } catch (e) {
    return reply({ status: false, message: e.message }, 502);
  }
};
