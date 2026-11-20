// Netlify Function - proxy Telegram (token hanya ada di environment variable Netlify)
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
const reply = (o, s = 200) => ({ statusCode: s, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(o) });

exports.handler = async (event) => {
  const h = event.headers || {};
  if (event.httpMethod !== 'POST') return reply({ ok: false }, 405);
  if (!sameOrigin(h)) return reply({ ok: false, message: 'Forbidden' }, 403);
  if (limited(h['x-nf-client-connection-ip'] || 'x', 30, 60000)) return reply({ ok: false, message: 'Terlalu banyak request' }, 429);
  const TOKEN = process.env.TELEGRAM_TOKEN, CHAT = process.env.TELEGRAM_CHAT_ID;
  if (!TOKEN || !CHAT) return reply({ ok: false, message: 'Telegram belum dikonfigurasi' }, 503);
  let text;
  try { text = String(JSON.parse(event.body || '{}').text || '').slice(0, 1500); } catch (_) { return reply({ ok: false }, 400); }
  if (!text) return reply({ ok: false }, 400);
  try {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT, text, parse_mode: 'HTML' })
    });
    return reply({ ok: r.ok });
  } catch (_) { return reply({ ok: false }, 502); }
};
