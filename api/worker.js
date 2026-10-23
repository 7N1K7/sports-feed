// Kickoff Kiwi's stats server. The site sends a small "page viewed" (or "feature used") message; this counts it by
// day. Unique visitors are counted without cookies: each visitor's address and browser are scrambled with a random
// salt that changes every day and is deleted two days later, so the codes can't be traced back to anyone. Nothing
// else about a visitor is kept: only totals by country, device, system and browser, app or not, and the site they came
// from; and, from the page, totals of what was picked or searched for, errors, load speed and the hour of the day.
// POST /report takes a visitor's "Report a problem" note (kept with the game it's about) or "Suggest an idea" note,
// a few a day each at most.
// GET /stats (with the owner's password) returns the totals and the reports for the private stats page.
const SITE = /^https:\/\/(www\.)?kickoff\.kiwi$/;
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|monitor|facebookexternalhit|whatsapp|discord|telegram|curl|wget|python|node-fetch|go-http/i;
const EVENTS = new Set(['install', 'appfirst', 'cal', 'alerts', 'rankings', 'alert-open', 'team', 'game', 'reveal']);
// events whose detail is counted too, each under its own name: the sport or competition picked, the team page opened,
// the words searched (search0: searches with no results), a page error, the load time band
// and which way to watch was tapped, which team was followed or dropped in My teams, and which part of the site was used
const KEYED = { sport: 'sport', comp: 'comp', team: 'teampage', search: 'search', search0: 'search0', error: 'error', speed: 'speed', watch: 'watch', follow: 'follow', unfollow: 'unfollow', use: 'use' };
const USE = new Set(['Free to watch', 'Events button', 'Results button', 'News button', 'Series row chip', 'Running now tile', 'Events ahead tile', 'Results tab in a game', 'Day in the week strip', 'Dot in the week strip', 'Filters folded away', 'Filters opened', 'Hide sport', 'Show sport', 'Show all results',
  'Settings', 'Spoiler eye', 'NZ only', 'Competition Results tab', 'Competition Squads tab', 'Competition Table tab', 'Competition Rankings tab', 'Competition Playoffs tab',
  'Competition News tab', 'Competition Shows tab', 'Competition Fights tab', 'Competition Races tab', 'Starting soon card', 'Report opened', 'Report sent', 'Suggest opened', 'Idea sent', 'Coffee link', 'Coffee in Settings', 'Sport order A–Z', 'Competition page from game', "Men's teams off", "Men's teams on", "Women's teams off", "Women's teams on"]);
// a visitor's settings, counted once a day each: results hidden or shown, card size, colour theme
const OG_THEMES = ['green', 'black', 'ocean', 'paua', 'purple', 'pink', 'red', 'orange', 'kowhai', 'lime'];
const VIEWS = new Set(['big', 'mixed', 'compact']), THEMES = new Set(['green', 'ocean', 'red', 'black', 'kowhai', 'paua', 'purple', 'orange', 'lime', 'pink', 'kauri', 'silver', 'tui', 'navy', 'olive']);
const keyOf = (e, k) => {
  let v = String(k ?? '').trim();
  if (e === 'search' || e === 'search0') v = v.toLowerCase().replace(/[^a-z0-9 '&.-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
  if (e === 'error') v = v.replace(/https?:\/\/\S+/g, '(link)').replace(/\s+/g, ' ').slice(0, 120);
  if (e === 'use' && !USE.has(v)) return '';
  if (e === 'watch' || e === 'follow' || e === 'unfollow') v = v.replace(/[^\p{L}\p{N} '&.+()/-]/gu, '').slice(0, 40);
  return v.length >= 2 ? v : '';
};
const nzHour = () => new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', hour: '2-digit', hourCycle: 'h23' }).format(new Date()).padStart(2, '0');
const osOf = ua => /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /CrOS/.test(ua) ? 'ChromeOS' : /Mac OS X|Macintosh/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Other';
const browserOf = ua => /SamsungBrowser/.test(ua) ? 'Samsung' : /Edg(A|iOS)?\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Other';
const MAX_PER_VISITOR = 300; // a day's hits from one visitor; past that it's a script, not a person

const nzDay = (t = Date.now()) => new Date(t).toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' });
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const sha = async s => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
const cors = origin => ({
  'access-control-allow-origin': SITE.test(origin || '') ? origin : 'https://kickoff.kiwi',
  'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type, authorization', vary: 'origin',
});
const json = (data, status, origin) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...cors(origin) } });
const bump = (env, day, metric, key = '') => env.DB.prepare('INSERT INTO daily (day, metric, key, n) VALUES (?1, ?2, ?3, 1) ON CONFLICT (day, metric, key) DO UPDATE SET n = n + 1').bind(day, metric, String(key).slice(0, 120));

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
  // the home-screen app and the browser on the same phone look like one visitor (same address and browser), and that
  // visitor's mode is set by whichever came first that day; so the app keeps its own tally of people who used it today
  if (b.app) {
    const ha = (await sha(`${salt}|${req.headers.get('cf-connecting-ip') || ''}|${ua}|app`)).slice(0, 20);
    const na = await env.DB.prepare('INSERT INTO seen (day, h, n) VALUES (?1, ?2, 1) ON CONFLICT (day, h) DO UPDATE SET n = n + 1 RETURNING n').bind(day, ha).first('n');
    if (na === 1) writes.push(bump(env, day, 'appvisitors'));
  }
  // a visit: the page loaded, or someone came back to it after 3+ minutes away ('open'); counted per visitor too
  const visit = !b.e || b.e === 'open';
  if (visit) writes.push(bump(env, day, 'opens'), env.DB.prepare('INSERT INTO opens (day, h, n) VALUES (?1, ?2, 1) ON CONFLICT (day, h) DO UPDATE SET n = n + 1').bind(day, h));
  if (b.e) {
    if (EVENTS.has(b.e)) writes.push(bump(env, day, 'event', b.e));
    const k = KEYED[b.e] && keyOf(b.e, b.k);
    if (k) writes.push(bump(env, day, KEYED[b.e], k));
  } else {
    writes.push(bump(env, day, 'views'), bump(env, day, 'hour', nzHour()));
    if (b.app) writes.push(bump(env, day, 'appviews'));
    const ref = String(b.r || '').toLowerCase().replace(/^www\./, '');
    if (ref && !/(^|\.)kickoff\.kiwi$/.test(ref) && /^[a-z0-9.-]+$/.test(ref)) writes.push(bump(env, day, 'ref', ref));
  }
  // the visitor's first message today, whatever it is (an app left open since yesterday may start with a tap)
  if (n === 1) {
    const device = /iPad|Tablet/i.test(ua) ? 'tablet' : /Mobi|Android|iPhone/i.test(ua) ? 'phone' : 'computer';
    writes.push(bump(env, day, 'visitors'), bump(env, day, 'country', req.cf?.country || '?'), bump(env, day, 'device', device), bump(env, day, 'mode', b.app ? 'app' : 'browser'),
      bump(env, day, 'os', osOf(ua)), bump(env, day, 'browser', browserOf(ua)));
    if (b.sp === 0 || b.sp === 1) writes.push(bump(env, day, 'spoil', b.sp ? 'hidden' : 'shown'));
    if (VIEWS.has(b.v)) writes.push(bump(env, day, 'view', b.v));
    if (THEMES.has(b.th)) writes.push(bump(env, day, 'theme', b.th));
  }
  if (writes.length) await env.DB.batch(writes);
}

// a visitor's report or idea (k: 'idea'): the note (3 to 500 characters), and the game's id and name when sent from a
// game's pop-up.
// Five a day from one visitor at most (counted with the same scrambled code as visits, deleted with it)
const MAX_REPORTS = 5;
async function report(req, env, body) {
  const ua = req.headers.get('user-agent') || '', origin = req.headers.get('origin') || '';
  if (BOT.test(ua) || !SITE.test(origin)) return 403;
  let b = {};
  try { b = JSON.parse(body); } catch { return 400; }
  const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  const note = clean(b.note, 500), id = clean(b.g, 120), title = clean(b.t, 160);
  if (note.length < 3) return 400;
  const day = nzDay();
  const fresh = hex(crypto.getRandomValues(new Uint8Array(16)));
  await env.DB.prepare('INSERT OR IGNORE INTO salt (day, v) VALUES (?1, ?2)').bind(day, fresh).run();
  const salt = (await env.DB.prepare('SELECT v FROM salt WHERE day = ?1').bind(day).first('v')) || fresh;
  const h = (await sha(`${salt}|${req.headers.get('cf-connecting-ip') || ''}|${ua}|report`)).slice(0, 20);
  const n = await env.DB.prepare('INSERT INTO seen (day, h, n) VALUES (?1, ?2, 1) ON CONFLICT (day, h) DO UPDATE SET n = n + 1 RETURNING n').bind(day, h).first('n');
  if (n > MAX_REPORTS) return 429;
  await env.DB.batch([
    env.DB.prepare('INSERT INTO reports (at, kind, ref, note) VALUES (?1, ?2, ?3, ?4)').bind(new Date().toISOString(), b.k === 'idea' ? 'idea' : id ? 'game' : 'site', id ? `${id}|${title}` : '', note),
    bump(env, day, 'use', b.k === 'idea' ? 'Idea sent' : 'Report sent'),
  ]);
  return 204;
}

const REPEAT = n => n <= 1 ? '1' : n <= 3 ? '2-3' : n <= 9 ? '4-9' : '10+';
async function repeats(env, day) {
  const { results } = await env.DB.prepare('SELECT n FROM opens WHERE day = ?1').bind(day).all();
  const out = {};
  for (const r of results) out[REPEAT(r.n)] = (out[REPEAT(r.n)] || 0) + 1;
  return out;
}
async function stats(env, url) {
  const days = Math.min(400, Math.max(1, +url.searchParams.get('days') || 60));
  const from = nzDay(Date.now() - (days - 1) * 864e5);
  const { results } = await env.DB.prepare('SELECT day, metric, key, n FROM daily WHERE day >= ?1 ORDER BY day').bind(from).all();
  // days whose visits per visitor are still held (today, yesterday) and not summed yet: work them out now
  const summed = new Set(results.filter(r => r.metric === 'repeat').map(r => r.day));
  const { results: held } = await env.DB.prepare('SELECT DISTINCT day FROM opens WHERE day >= ?1').bind(from).all();
  for (const { day } of held) if (!summed.has(day)) for (const [key, n] of Object.entries(await repeats(env, day))) results.push({ day, metric: 'repeat', key, n });
  const { results: reports } = await env.DB.prepare('SELECT id, at, kind, ref, note FROM reports WHERE at >= ?1 ORDER BY at DESC LIMIT 300').bind(from).all();
  return { from, today: nzDay(), rows: results, reports };
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
    if (url.pathname === '/report' && req.method === 'POST') {
      const body = (await req.text().catch(() => '')).slice(0, 4000);
      const status = await report(req, env, body).catch(e => (console.error('report failed:', e.message), 500));
      return new Response(null, { status, headers: cors(origin) });
    }
    // the link preview picture: one of the ten theme colours at random, fresh each time it's asked for (chat apps keep
    // the one they got for a while, so a link shows the same colour there until their copy expires)
    if (url.pathname === '/og.png' && req.method === 'GET') {
      const t = OG_THEMES[Math.floor(Math.random() * OG_THEMES.length)];
      const img = await fetch(`https://kickoff.kiwi/og/${t}.png`, { cf: { cacheTtl: 86400 } });
      return new Response(img.body, { status: img.status, headers: { 'content-type': 'image/png', 'cache-control': 'no-store' } });
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
    // sum up the visits per visitor of each finished day still held, then let the codes go
    const keep = nzDay(Date.now() - 2 * 864e5), today = nzDay();
    const { results: held } = await env.DB.prepare('SELECT DISTINCT day FROM opens WHERE day < ?1').bind(today).all();
    for (const { day } of held) {
      const done = await env.DB.prepare("SELECT 1 FROM daily WHERE day = ?1 AND metric = 'repeat' LIMIT 1").bind(day).first();
      if (done) continue;
      const rows = Object.entries(await repeats(env, day));
      if (rows.length) await env.DB.batch(rows.map(([key, n]) => env.DB.prepare("INSERT INTO daily (day, metric, key, n) VALUES (?1, 'repeat', ?2, ?3) ON CONFLICT (day, metric, key) DO UPDATE SET n = ?3").bind(day, key, n)));
    }
    await env.DB.batch(['seen', 'salt', 'opens'].map(t => env.DB.prepare(`DELETE FROM ${t} WHERE day < ?1`).bind(keep)));
  },
};
