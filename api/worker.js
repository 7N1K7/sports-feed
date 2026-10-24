// Kickoff Kiwi's stats server. The site sends a small "page viewed" (or "feature used") message; this counts it by
// day. Unique visitors are counted without cookies: each visitor's address and browser are scrambled with a random
// salt that changes every day and is deleted two days later, so the codes can't be traced back to anyone. Nothing
// else about a visitor is kept: only totals by country, device, system and browser, app or not, and the site they came
// from; and, from the page, totals of what was picked or searched for, errors, load speed and the hour of the day.
// POST /report takes a visitor's "Report a problem" note (kept with the game it's about) or "Suggest an idea" note,
// a few a day each at most.
// GET /stats (with the owner's password) returns the totals, the reports and the site's data coverage at each version
// for the private stats page.
const SITE = /^https:\/\/(www\.)?kickoff\.kiwi$/;
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|monitor|facebookexternalhit|whatsapp|discord|telegram|curl|wget|python|node-fetch|go-http/i;
const EVENTS = new Set(['install', 'appfirst', 'cal', 'alerts', 'rankings', 'alert-open', 'team', 'game', 'reveal']);
// events whose detail is counted too, each under its own name: the sport or competition picked, the team page opened,
// the words searched (search0: searches with no results), a page error, the load time band
// and which way to watch was tapped, which team was followed or dropped in My teams, which sport was hidden or shown
// there, which part of the site was used, and the sites people follow links out to
const KEYED = { game: 'gameopen', sport: 'sport', comp: 'comp', team: 'teampage', search: 'search', search0: 'search0', error: 'error', speed: 'speed', watch: 'watch', follow: 'follow', unfollow: 'unfollow', use: 'use', hidesport: 'hidesport', showsport: 'showsport', out: 'outlink' };
const USE = new Set(['Free to watch', 'Events button', 'Results button', 'News button', 'Series row chip', 'Running now tile', 'Events ahead tile', 'Results tab in a game', 'Day in the week strip', 'Dot in the week strip', 'Filters folded away', 'Filters opened', 'Hide sport', 'Show sport', 'Show all results',
  'Settings', 'Spoiler eye', 'NZ only', 'Competition Results tab', 'Competition Squads tab', 'Competition Table tab', 'Competition Rankings tab', 'Competition Playoffs tab',
  'Competition News tab', 'Competition Shows tab', 'Competition Build-up tab', 'Competition Fights tab', 'Competition Races tab', 'Starting soon card', 'Report opened', 'Report sent', 'Suggest opened', 'Idea sent', 'Coffee link', 'Coffee in Settings', 'Sport order A–Z', 'Competition page from game', "Men's teams off", "Men's teams on", "Women's teams off", "Women's teams on",
  'Select all teams', 'Default teams', 'Clear all teams', 'Card size List', 'Card size Compact', 'Card size Standard', 'Card size Large', 'Theme changed', 'Time zone changed', 'Hide results for changed',
  'Settings code copied', 'Settings code used', 'Hidden sports list name',
  // from 24 Oct 2026: every other button
  'All competitions picked', 'All sports button', 'Back in a pop-up', 'Back to top button', 'Competition menu opened', 'Competition page closed', 'Events ahead page turned', 'Search result game', 'Playoff bracket game', 'Game from a team page', 'Search result team', 'Team from rankings', 'Team from form', 'Team from a table', 'Team from a game', 'Hide a result again', 'Hide all results again', 'Install app button', 'Later page turned', 'Logo to the top', 'News page turned', 'Rankings back', 'Rankings list button', 'Rankings sport button', 'Results page turned', 'Running now page turned', 'Series row arrow', 'Sport button off', 'News filter All', 'News filter Injuries', 'News filter Squads', 'News filter Results', 'News filter Other', 'Free to watch off', 'NZ only off', 'F1 sessions on', 'F1 sessions off', 'Supercars sessions on', 'Supercars sessions off', 'Game tab in a game', "Men's and women's", "Men's only", "Women's only"]);
// a visitor's settings, counted once a day each: results hidden or shown, card size, colour theme
const OG_THEMES = ['green', 'black', 'ocean', 'paua', 'purple', 'pink', 'red', 'orange', 'kowhai', 'lime'];
const VIEWS = new Set(['big', 'mixed', 'compact', 'list']), THEMES = new Set(['green', 'ocean', 'red', 'black', 'kowhai', 'paua', 'purple', 'orange', 'lime', 'pink', 'kauri', 'silver', 'tui', 'navy', 'olive']);
const keyOf = (e, k) => {
  let v = String(k ?? '').trim();
  if (e === 'search' || e === 'search0') v = v.toLowerCase().replace(/[^a-z0-9 '&.-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
  if (e === 'error') v = v.replace(/https?:\/\/\S+/g, '(link)').replace(/\s+/g, ' ').slice(0, 120);
  if (e === 'use' && !USE.has(v)) return '';
  if ((e === 'hidesport' || e === 'showsport') && !/^[a-z]{2,20}$/.test(v)) return '';
  if (e === 'out' && !/^[a-z0-9.-]{3,60}$/.test(v = v.toLowerCase())) return '';
  if (e === 'watch' || e === 'follow' || e === 'unfollow') v = v.replace(/[^\p{L}\p{N} '&.+()/-]/gu, '').slice(0, 40);
  if (e === 'game') v = v.replace(/[^\p{L}\p{N} '&.+()/:,-]/gu, '').replace(/\s+/g, ' ').slice(0, 100);
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
    // the sports on in the visitor's My teams, and whether their browser had been to the site before
    if (Array.isArray(b.fs)) for (const s of b.fs.slice(0, 30)) if (/^[a-z]{2,20}$/.test(s)) writes.push(bump(env, day, 'follows', s));
    // from 24 Oct 2026 the page sends the sports turned off instead (everything is on to start with), and whether My teams
    // has been changed from what a new visitor gets
    if (Array.isArray(b.fo)) for (const s of b.fo.slice(0, 30)) if (/^[a-z]{2,20}$/.test(s)) writes.push(bump(env, day, 'sportsoff', s));
    if (b.tc === 0 || b.tc === 1) writes.push(bump(env, day, 'myteams', b.tc ? 'changed' : 'default'));
    if (b.nv === 0 || b.nv === 1) writes.push(bump(env, day, 'newvis', b.nv ? 'first visit' : 'been before'));
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
// the site's data coverage at each version: of the next three weeks' games, how many have a start time, a way to watch,
// squads and so on (data/coverage.json, written by the feed builder). Read from the live site every hour and when the
// stats page opens, so the page can chart it over time; a version's row keeps the latest figures it had. Never throws
const COVERAGE_CRON = '47 * * * *', CLEANUP_CRON = '17 14 * * *'; // the same strings as in wrangler.toml
async function snapCoverage(env) {
  try {
    // a fresh copy (the time in the address gets past any cache), and never a long wait (the stats page waits for this)
    const r = await fetch(`https://kickoff.kiwi/data/coverage.json?t=${Date.now()}`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return;
    const text = await r.text();
    if (text.length > 20000) return; // it's about 1 KB; anything much bigger isn't it
    const j = JSON.parse(text), at = String(j.at || '');
    if (!Number.isInteger(j.v) || j.v < 1 || !/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(at) || !j.cov || typeof j.cov !== 'object') return;
    // only sport names and whole counts are kept
    const cov = {};
    for (const [k, a] of Object.entries(j.cov)) if (/^[a-z]{2,20}$/.test(k) && Array.isArray(a)) cov[k] = a.slice(0, 12).map(n => Number.isInteger(n) && n >= 0 ? n : 0);
    await env.DB.prepare('INSERT INTO coverage (v, at, data) VALUES (?1, ?2, ?3) ON CONFLICT (v) DO UPDATE SET at = excluded.at, data = excluded.data WHERE excluded.at > coverage.at')
      .bind(j.v, at, JSON.stringify(cov)).run();
  } catch (e) { console.error('coverage snapshot failed:', e.message); }
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
  // the coverage snapshots: the newest 150 versions, oldest first
  const { results: snaps } = await env.DB.prepare('SELECT v, at, data FROM coverage ORDER BY v DESC LIMIT 150').all();
  const coverage = snaps.reverse().map(r => ({ v: r.v, at: r.at, cov: JSON.parse(r.data) }));
  return { from, today: nzDay(), rows: results, reports, coverage };
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
      // the coverage now live first, so the page shows the current version (only for the owner, so no one else can
      // make the server fetch and write)
      await snapCoverage(env);
      return json(await stats(env, url), 200, origin);
    }
    return new Response('Kickoff Kiwi stats', { status: 404 });
  },
  // hourly: the site's coverage figures (see snapCoverage). Daily: the visitor codes and salts older than two days go,
  // so old codes can never be matched to anyone. Each runs on its own cron only
  async scheduled(event, env) {
    if (event.cron === COVERAGE_CRON) return snapCoverage(env);
    if (event.cron !== CLEANUP_CRON) return;
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
