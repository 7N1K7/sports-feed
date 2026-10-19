// Kickoff Kiwi's stats server. The site sends a small "page viewed" (or "feature used") message; this counts it by
// day. Unique visitors are counted without cookies: each visitor's address and browser are scrambled with a random
// salt that changes every day and is deleted two days later, so the codes can't be traced back to anyone. Nothing
// else about a visitor is kept: only totals by country, device, app or browser, and the site they came from.
// GET /stats (with the owner's password) returns the totals for the private stats page.
const SITE = /^https:\/\/(www\.)?kickoff\.kiwi$/;
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|monitor|facebookexternalhit|whatsapp|discord|telegram|curl|wget|python|node-fetch|go-http/i;
const EVENTS = new Set(['install', 'cal', 'alerts', 'rankings', 'alert-open', 'team', 'game']);
const MAX_PER_VISITOR = 300; // a day's hits from one visitor; past that it's a script, not a person

const nzDay = (t = Date.now()) => new Date(t).toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' });
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const sha = async s => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
const cors = origin => ({
  'access-control-allow-origin': SITE.test(origin || '') ? origin : 'https://kickoff.kiwi',
  'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type, authorization', vary: 'origin',
});
const json = (data, status, origin) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...cors(origin) } });
const bump = (env, day, metric, key = '') => env.DB.prepare('INSERT INTO daily (day, metric, key, n) VALUES (?1, ?2, ?3, 1) ON CONFLICT (day, metric, key) DO UPDATE SET n = n + 1').bind(day, metric, String(key).slice(0, 60));

async function hit(req, env, body) {
  const ua = req.headers.get('user-agent') || '';
  const origin = req.headers.get('origin') || '';
  if (BOT.test(ua) || (origin && !SITE.test(origin))) return;
  let b = {};
  try { b = JSON.parse(body); } catch { return; }
  const day = nzDay();
  // today's salt, made by whichever visit comes first
  const fresh = hex(crypto.getRandomValues(new Uint8Array(16)));
  await env.DB.prepare('INSERT OR IGNORE INTO salt (day, v) VALUES (?1, ?2)').bind(day, fresh).run();
  const salt = (await env.DB.prepare('SELECT v FROM salt WHERE day = ?1').bind(day).first('v')) || fresh;
  const h = (await sha(`${salt}|${req.headers.get('cf-connecting-ip') || ''}|${ua}`)).slice(0, 20);
  const n = await env.DB.prepare('INSERT INTO seen (day, h, n) VALUES (?1, ?2, 1) ON CONFLICT (day, h) DO UPDATE SET n = n + 1 RETURNING n').bind(day, h).first('n');
  if (n > MAX_PER_VISITOR) return;
  const writes = [];
  if (b.e) { if (EVENTS.has(b.e)) writes.push(bump(env, day, 'event', b.e)); }
  else {
    writes.push(bump(env, day, 'views'));
    if (b.app) writes.push(bump(env, day, 'appviews'));
    const ref = String(b.r || '').toLowerCase().replace(/^www\./, '');
    if (ref && !/(^|\.)kickoff\.kiwi$/.test(ref) && /^[a-z0-9.-]+$/.test(ref)) writes.push(bump(env, day, 'ref', ref));
    if (n === 1) { // first view today from this visitor
      const device = /iPad|Tablet/i.test(ua) ? 'tablet' : /Mobi|Android|iPhone/i.test(ua) ? 'phone' : 'computer';
      writes.push(bump(env, day, 'visitors'), bump(env, day, 'country', req.cf?.country || '?'), bump(env, day, 'device', device), bump(env, day, 'mode', b.app ? 'app' : 'browser'));
    }
  }
  if (writes.length) await env.DB.batch(writes);
}

async function stats(env, url) {
  const days = Math.min(400, Math.max(1, +url.searchParams.get('days') || 60));
  const from = nzDay(Date.now() - (days - 1) * 864e5);
  const { results } = await env.DB.prepare('SELECT day, metric, key, n FROM daily WHERE day >= ?1 ORDER BY day').bind(from).all();
  return { from, today: nzDay(), rows: results };
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), origin = req.headers.get('origin') || '';
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    if (url.pathname === '/hit' && req.method === 'POST') {
      // the message is read before replying (it's gone after), then counted after the reply so the page never waits
      const body = await req.text().catch(() => '');
      ctx.waitUntil(hit(req, env, body).catch(e => console.error('hit failed:', e.message)));
      return new Response(null, { status: 204, headers: cors(origin) });
    }
    if (url.pathname === '/stats' && req.method === 'GET') {
      if (!env.STATS_PASSWORD) return json({ error: 'not-set-up' }, 503, origin);
      const given = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
      if (!given || (await sha(given)) !== (await sha(env.STATS_PASSWORD))) return json({ error: 'wrong-password' }, 401, origin);
      return json(await stats(env, url), 200, origin);
    }
    return new Response('Kickoff Kiwi stats', { status: 404 });
  },
  // daily: the visitor codes and salts older than two days go, so old codes can never be matched to anyone
  async scheduled(event, env) {
    const keep = nzDay(Date.now() - 2 * 864e5);
    await env.DB.batch([env.DB.prepare('DELETE FROM seen WHERE day < ?1').bind(keep), env.DB.prepare('DELETE FROM salt WHERE day < ?1').bind(keep)]);
  },
};
