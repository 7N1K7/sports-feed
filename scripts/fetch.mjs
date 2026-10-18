// Builds data/feed.json from free sources plus hand-kept curated files.
// Run: node scripts/fetch.mjs   (Node 20+, no dependencies)
//
// Sources
//   ESPN unofficial scoreboard API  -> rugby (tests, Super Rugby, NPC) and NRL fixtures + live scores
//   RNZ sport RSS                   -> news, tagged to teams by keyword
//   data/curated/*.json             -> fixtures ESPN lacks (Kiwis, Black Ferns, cricket), news, notes
//   data/broadcast.json             -> where-to-watch rules by competition
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);
const DAY = 864e5;
const now = Date.now();
const diag = {}; // per-source health, written into feed.json

const ESPN = [
  { sport: 'rugby', path: 'rugby/289234', comp: 'Test match' },
  { sport: 'rugby', path: 'rugby/244293', comp: 'Rugby Championship' },
  { sport: 'rugby', path: 'rugby/242041', comp: 'Super Rugby Pacific' },
  { sport: 'rugby', path: 'rugby/270563', comp: 'NPC' },
  { sport: 'league', path: 'rugby-league/3', comp: 'NRL' },
  { sport: 'football', path: 'soccer/aus.1', comp: 'A-League Men' },
  { sport: 'mma', path: 'mma/ufc', comp: 'UFC' },
];

// Which followable item(s) an ESPN fixture belongs to.
// `team` is the most specific (it picks the badge); `tags` are whole-competition follows.
const SR_NZ = [['blues','Blues'],['chiefs','Chiefs'],['hurricanes','Hurricanes'],['crusaders','Crusaders'],['highlanders','Highlanders'],['moana','Moana Pasifika']];
const SR_AU = /Brumbies|Reds|Waratahs|Western Force/;
function classify(comp, home, away) {
  const names = [home, away].join(' | ');
  if (comp === 'NPC') return { team: 'npc', tags: [] };
  if (comp === 'NRL') return { team: /Warriors/.test(names) ? 'warriors' : 'nrl', tags: ['nrl'] };
  if (comp === 'A-League Men') {
    const team = /Wellington Phoenix/.test(names) ? 'phoenix' : /Auckland FC/.test(names) ? 'aucklandfc' : 'aleague';
    return { team, tags: ['aleague'] };
  }
  if (comp === 'UFC') return { team: 'ufc', tags: [] };
  if (comp === 'Super Rugby Pacific') {
    const nz = SR_NZ.find(([, n]) => names.includes(n));
    const tags = ['superrugby', ...(SR_AU.test(names) ? ['aurugby'] : [])];
    return { team: nz ? nz[0] : SR_AU.test(names) ? 'aurugby' : 'superrugby', tags };
  }
  // tests
  const tags = /\bAustralia\b|Wallabies/.test(names) ? ['wallabies'] : [];
  if (/New Zealand Women|Black Ferns/.test(names)) return { team: 'blackferns', tags };
  if (/\bNew Zealand\b|All Blacks/.test(names)) return { team: 'allblacks', tags };
  if (/Australia Women|Wallaroos/.test(names)) return null;
  if (tags.length) return { team: 'wallabies', tags };
  return null;
}

const CITY_TZ = {
  Sydney: 'Australia/Sydney', Newcastle: 'Australia/Sydney', Canberra: 'Australia/Sydney', Melbourne: 'Australia/Melbourne',
  Brisbane: 'Australia/Brisbane', 'Gold Coast': 'Australia/Brisbane', Townsville: 'Australia/Brisbane', Perth: 'Australia/Perth',
  Adelaide: 'Australia/Adelaide', Darwin: 'Australia/Darwin', Hobart: 'Australia/Hobart', 'Port Moresby': 'Pacific/Port_Moresby',
  Suva: 'Pacific/Fiji', Lautoka: 'Pacific/Fiji', Apia: 'Pacific/Apia', Tokyo: 'Asia/Tokyo',
};
const COUNTRY_TZ = {
  'New Zealand': 'Pacific/Auckland', Australia: 'Australia/Sydney', USA: 'America/New_York', 'United States': 'America/New_York', Canada: 'America/Toronto', England: 'Europe/London', Scotland: 'Europe/London', Wales: 'Europe/London',
  'United Kingdom': 'Europe/London', Ireland: 'Europe/Dublin', France: 'Europe/Paris', Italy: 'Europe/Rome',
  'South Africa': 'Africa/Johannesburg', Argentina: 'America/Argentina/Buenos_Aires', Japan: 'Asia/Tokyo',
  Fiji: 'Pacific/Fiji', Samoa: 'Pacific/Apia', Tonga: 'Pacific/Tongatapu', 'Papua New Guinea': 'Pacific/Port_Moresby',
};
Object.assign(CITY_TZ, { Edmonton: 'America/Edmonton', Calgary: 'America/Edmonton', Vancouver: 'America/Vancouver', Montreal: 'America/Toronto', Gosford: 'Australia/Sydney', 'New South Wales': 'Australia/Sydney', Victoria: 'Australia/Melbourne', Queensland: 'Australia/Brisbane', 'Las Vegas': 'America/Los_Angeles', 'Los Angeles': 'America/Los_Angeles', 'New York': 'America/New_York', Newark: 'America/New_York', Miami: 'America/New_York', Houston: 'America/Chicago', Chicago: 'America/Chicago', Denver: 'America/Denver', 'Abu Dhabi': 'Asia/Dubai', Riyadh: 'Asia/Riyadh', London: 'Europe/London', Paris: 'Europe/Paris', 'Mexico City': 'America/Mexico_City', 'Rio de Janeiro': 'America/Sao_Paulo', 'São Paulo': 'America/Sao_Paulo', Singapore: 'Asia/Singapore', Shanghai: 'Asia/Shanghai', Macau: 'Asia/Macau', Toronto: 'America/Toronto', Perth: 'Australia/Perth', Auckland: 'Pacific/Auckland' });
const tzFor = (city = '', country = '') => CITY_TZ[city] || COUNTRY_TZ[country] || null;

const ymd = t => new Date(t).toISOString().slice(0, 10).replaceAll('-', '');

async function getJSON(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'sports-feed (personal site)' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

// ESPN rejects some date-range shapes, so try a few and keep the first that works
async function espnScoreboard(path) {
  const base = `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard`;
  const months = [-1, 0, 1, 2].map(m => { const d = new Date(now); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + m); return d.toISOString().slice(0, 7).replace('-', ''); });
  const tries = [
    ['range', [`${base}?dates=${ymd(now - 14 * DAY)}-${ymd(now + 60 * DAY)}`]],
    ['months', months.map(m => `${base}?dates=${m}`)],
    ['default', [base]],
  ];
  const errors = [];
  for (const [name, urls] of tries) {
    try {
      const pages = await Promise.all(urls.map(getJSON));
      const events = pages.flatMap(p => p.events || []);
      return { name, data: { leagues: pages[0].leagues, events }, errors };
    } catch (e) { errors.push(`${name}: ${e.message.split(' ')[0]}`); }
  }
  throw new Error(errors.join(', '));
}

// A UFC event is one card of many fights; show it as the main event, starting with the first fight.
function ufcCard(ev) {
  const fights = ev.competitions || [];
  if (!fights.length) return null;
  const main = fights.reduce((a, b) => (new Date(b.date || ev.date) >= new Date(a.date || ev.date) ? b : a));
  const names = (main.competitors || []).map(x => x.athlete?.displayName || x.athlete?.shortName).filter(Boolean);
  const states = fights.map(f => f.status?.type?.state);
  const status = states.every(x => x === 'post') ? 'final' : states.some(x => x === 'in' || x === 'post') ? 'live' : 'upcoming';
  const winner = (main.competitors || []).find(x => x.winner)?.athlete?.displayName;
  const addr = (main.venue || fights[0].venue)?.address || {};
  const first = fights.map(f => f.date || ev.date).sort()[0];
  return {
    id: `espn-${ev.id}`, espnId: ev.id, espnPath: 'mma/ufc', team: 'ufc', tags: [], sport: 'mma', comp: ev.name || 'UFC', compKey: 'UFC',
    home: names[0] || 'TBC', away: names[1] || 'TBC', startUTC: new Date(first).toISOString(), timeTBC: false,
    venue: (main.venue || fights[0].venue)?.fullName || '', city: [addr.city, addr.country].filter(Boolean).join(', '),
    tz: tzFor(addr.city, addr.country) || ({ 'United States': null }[addr.country] ?? null),
    status, score: status === 'final' && winner ? `${winner} won` : undefined,
    summary: status === 'final' && winner ? `${winner} won the main event.` : undefined,
    note: `${fights.length} fights · main event about ${new Date(main.date || ev.date).toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland', hour: 'numeric', minute: '2-digit' })} NZ time`,
    source: `https://www.espn.com/mma/fightcenter/_/id/${ev.id}`,
  };
}

async function espnEvents() {
  const out = [];
  for (const src of ESPN) {
    let data;
    try {
      const r = await espnScoreboard(src.path);
      data = r.data;
      diag[src.path] = `${data.events.length} events via ${r.name}${r.errors.length ? ' (' + r.errors.join(', ') + ')' : ''}`;
    } catch (e) { console.warn('ESPN failed:', src.path, e.message); diag[src.path] = 'error: ' + e.message; continue; }
    for (const ev of data.events || []) {
      if (out.some(o => o.id === `espn-${ev.id}`)) continue;
      if (src.comp === 'UFC') { const u = ufcCard(ev); if (u) out.push(u); continue; }
      const c = ev.competitions?.[0];
      if (!c) continue;
      const home = c.competitors?.find(x => x.homeAway === 'home') || c.competitors?.[0];
      const away = c.competitors?.find(x => x.homeAway === 'away') || c.competitors?.[1];
      const hn = home?.team?.displayName, an = away?.team?.displayName;
      const cls = classify(src.comp, hn, an);
      if (!cls) continue;
      const st = c.status?.type || ev.status?.type || {};
      const status = st.state === 'post' || st.completed ? 'final' : st.state === 'in' ? 'live' : 'upcoming';
      const addr = c.venue?.address || {};
      out.push({
        id: `espn-${ev.id}`, espnId: ev.id, espnPath: src.path, team: cls.team, tags: cls.tags, sport: src.sport,
        comp: data.leagues?.[0]?.name || src.comp, compKey: src.comp,
        home: hn, away: an, startUTC: new Date(ev.date).toISOString(), timeTBC: false,
        venue: c.venue?.fullName || '', city: [addr.city, addr.country].filter(Boolean).join(', '),
        tz: tzFor(addr.city, addr.country),
        status, clock: status === 'live' ? (st.shortDetail || st.detail || '') : undefined,
        score: status !== 'upcoming' && home?.score != null ? `${home.score}-${away.score}` : undefined,
        source: ev.links?.[0]?.href || `https://www.espn.com/${src.sport === 'football' ? 'soccer' : src.path.split('/')[0]}/match/_/gameId/${ev.id}`,
      });
    }
  }
  return out;
}

// --- cricket from ESPN's scoreboard header (current series only) ----------
// Picks up Big Bash, WBBL and New Zealand internationals while they're on.
async function espnCricket() {
  let data;
  try { data = await getJSON('https://site.web.api.espn.com/apis/v2/scoreboard/header?sport=cricket&region=au&lang=en&contentorigin=espn'); }
  catch (e) { diag.cricket = 'error: ' + e.message; return []; }
  const leagues = data.sports?.[0]?.leagues || [];
  diag.cricketLeagues = leagues.map(l => `${l.name} (${(l.events || []).length})`).slice(0, 25);
  const out = [];
  for (const lg of leagues) {
    const lname = lg.name || lg.shortName || '';
    for (const ev of lg.events || []) {
      const comps = ev.competitors || [];
      const names = comps.map(c => c.displayName || c.name || '').join(' | ');
      let team = null;
      if (/Women'?s Big Bash|WBBL/i.test(lname)) team = 'wbbl';
      else if (/Big Bash|BBL/i.test(lname)) team = 'bbl';
      else if (/New Zealand Women/.test(names)) team = 'whiteferns';
      else if (/New Zealand/.test(names)) team = 'blackcaps';
      if (!team) continue;
      const home = comps.find(c => c.homeAway === 'home') || comps[0] || {}, away = comps.find(c => c.homeAway === 'away') || comps[1] || {};
      const state = ev.status === 'in' || ev.fullStatus?.type?.state === 'in' ? 'live' : (ev.status === 'post' || ev.fullStatus?.type?.state === 'post') ? 'final' : 'upcoming';
      const sc = [home, away].map(c => c.score ? `${c.abbreviation || c.displayName} ${c.score}` : '').filter(Boolean).join(' v ');
      out.push({
        id: `espn-${ev.id}`, espnId: ev.id, espnPath: 'cricket-header', team, tags: [], sport: 'cricket', comp: `${lname}${ev.description ? ' · ' + ev.description : ''}`, compKey: lname,
        home: home.displayName || 'TBC', away: away.displayName || 'TBC', startUTC: new Date(ev.date).toISOString(), timeTBC: false,
        venue: '', city: ev.location || '', tz: null, status: state,
        clock: state === 'live' ? (ev.summary || ev.fullStatus?.type?.shortDetail || '') : undefined,
        score: state !== 'upcoming' && sc ? sc : undefined,
        summary: state === 'final' ? (ev.summary || ev.fullStatus?.type?.detail || '') : undefined,
        source: ev.link || `https://www.espncricinfo.com/`,
      });
    }
  }
  diag.cricket = `${out.length} matching`;
  return out;
}

// --- news from RNZ RSS -------------------------------------------------
const NEWS_TEAMS = [
  ['allblacks', /All Blacks|Razor|Scott Robertson/i], ['blackferns', /Black Ferns/i],
  ['npc', /\bNPC\b|Ranfurly|provincial/i], ['fpc', /Farah Palmer/i],
  ['blues', /\bBlues\b/], ['chiefs', /\bChiefs\b/], ['hurricanes', /Hurricanes/], ['crusaders', /Crusaders/],
  ['highlanders', /Highlanders/], ['moana', /Moana Pasifika/i],
  ['blackcaps', /Black ?Caps/i], ['whiteferns', /White Ferns/i], ['nzdomestic', /Plunket Shield|Ford Trophy|Super Smash|Hallyburton/i],
  ['kiwis', /\bKiwis\b/], ['kiwiferns', /Kiwi Ferns/i], ['warriors', /Warriors/],
];
function kindOf(text) {
  if (/injur|ruled out|surgery|hamstring|concussion|sidelined|fracture|broken/i.test(text)) return 'injury';
  if (/squad|named|selected|recalled|debut|line-?up|team to (play|face)|contract|signs?\b|re-sign/i.test(text)) return 'squad';
  if (/\bbeat|\bwin\b|\bwins\b|\bwon\b|thrash|defeat|\bloss\b|\blose\b|draw|\d+-\d+/i.test(text)) return 'result';
  return 'news';
}
const unxml = s => (s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").trim();

async function rnzNews() {
  let xml;
  try {
    const r = await fetch('https://www.rnz.co.nz/rss/sport.xml');
    if (!r.ok) throw new Error(r.status);
    xml = await r.text();
  } catch (e) { console.warn('RNZ failed:', e.message); diag.rnz = 'error: ' + e.message; return []; }
  const out = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const get = tag => unxml((m[1].match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) || [])[1]);
    const title = get('title'), summary = get('description'), url = get('link');
    const image = (m[1].match(/<(?:media:content|media:thumbnail|enclosure)[^>]*url="([^"]+)"/) || [])[1];
    const team = NEWS_TEAMS.find(([, re]) => re.test(title + ' ' + summary))?.[0];
    if (!team) continue;
    const d = new Date(get('pubDate'));
    out.push({
      id: 'rnz-' + url.split('/').filter(Boolean).slice(-2).join('-').slice(0, 80), team,
      date: isNaN(d) ? new Date(now).toISOString().slice(0, 10) : d.toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' }),
      kind: kindOf(title + ' ' + summary), title, summary: summary.slice(0, 280), url, source: 'RNZ', image,
    });
  }
  diag.rnz = `${out.length} matching stories`;
  return out;
}

// --- merge -------------------------------------------------------------
const ALIAS = [[/all blacks|black ferns|kiwi ferns|\bkiwis\b|white ferns|black ?caps/gi, 'new zealand'], [/wallabies|kangaroos|jillaroos|wallaroos/gi, 'australia'], [/springboks/gi, 'south africa'], [/pumas/gi, 'argentina']];
const norm = s => ALIAS.reduce((t, [re, to]) => t.replace(re, to), s || '').toLowerCase().replace(/women|bulls|stags|storm|pride|mako|steamers|heartland|rugby|the /g, '').replace(/[^a-z]/g, '');
function sameMatch(a, b) {
  if (Math.abs(new Date(a.startUTC) - new Date(b.startUTC)) > (a.timeTBC || b.timeTBC ? 2 * DAY : 8 * 36e5)) return false;
  const A = [norm(a.home), norm(a.away)], B = [norm(b.home), norm(b.away)];
  return A.some(x => x && B.some(y => y && (x.includes(y) || y.includes(x))));
}

async function readCurated() {
  const dir = new URL('data/curated/', ROOT);
  const events = [], news = [];
  for (const f of (await readdir(dir)).filter(f => f.endsWith('.json'))) {
    const d = JSON.parse(await readFile(new URL(f, dir), 'utf8'));
    events.push(...(d.events || [])); news.push(...(d.news || []));
  }
  return { events, news };
}

function applyBroadcast(e, rules) {
  if (e.broadcast && e.broadcast !== 'TBC') return;
  const r = rules.find(r => (!r.team || r.team === e.team) && (!r.comp || new RegExp(r.comp, 'i').test(e.comp)));
  if (r) { e.broadcast = r.broadcast; if (r.watchAlt && !e.watchAlt) e.watchAlt = r.watchAlt; if (r.watchNote && !e.watchNote) e.watchNote = r.watchNote; }
}

const curated = await readCurated();
const rules = JSON.parse(await readFile(new URL('data/broadcast.json', ROOT), 'utf8'));
const live = [...await espnEvents(), ...await espnCricket()];

const events = curated.events.map(e => ({ ...e }));
for (const le of live) {
  const hit = events.find(e => e.team === le.team && sameMatch(e, le));
  if (hit) {
    // ESPN wins on time, status and score; curated keeps names, venue notes and broadcast
    Object.assign(hit, { startUTC: le.startUTC, timeTBC: false, status: le.status, clock: le.clock, espnId: le.espnId, espnPath: le.espnPath, tags: [...new Set([...(hit.tags || []), ...(le.tags || [])])] });
    if (le.score) hit.score = le.score;
    if (!hit.tz && le.tz) hit.tz = le.tz;
  } else events.push(le);
}
events.forEach(e => applyBroadcast(e, rules));

const newsAll = [...curated.news];
for (const n of await rnzNews()) if (!newsAll.some(x => x.url === n.url || x.title === n.title)) newsAll.push(n);
const news = newsAll.filter(n => now - new Date(n.date) < 30 * DAY);

// Thumbnails: read each article's og:image once and remember it in .cache/og.json
async function addImages(items) {
  const cacheUrl = new URL('.cache/og.json', ROOT);
  let cache = {};
  try { cache = JSON.parse(await readFile(cacheUrl, 'utf8')); } catch {}
  const todo = items.filter(n => !n.image && n.url && !(n.url in cache)).slice(0, 40);
  await Promise.all(todo.map(async n => {
    try {
      const r = await fetch(n.url, { headers: { 'user-agent': 'Mozilla/5.0 (sports-feed thumbnail bot)' }, signal: AbortSignal.timeout(8000) });
      const html = (await r.text()).slice(0, 200000);
      const m = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/i);
      cache[n.url] = m ? new URL(m[1].replace(/&amp;/g, '&'), n.url).href : null;
    } catch { cache[n.url] = null; }
  }));
  for (const n of items) if (!n.image && cache[n.url]) n.image = cache[n.url];
  diag.thumbnails = `${items.filter(n => n.image).length}/${items.length} (${todo.length} looked up)`;
  try { await mkdir(new URL('.cache/', ROOT), { recursive: true }); await writeFile(cacheUrl, JSON.stringify(cache)); } catch {}
}
await addImages(news);

const feed = {
  generatedAt: new Date(now).toISOString(),
  diag: { ...diag, espnMatched: live.length },
  events: events.filter(e => now - new Date(e.startUTC) < 21 * DAY),
  news,
  sources: [
    { name: 'ESPN', url: 'https://www.espn.com/rugby/' }, { name: 'RNZ Sport', url: 'https://www.rnz.co.nz/news/sport' },
    { name: 'NZ Rugby', url: 'https://www.allblacks.com' }, { name: 'NZ Cricket', url: 'https://www.nzc.nz' },
    { name: 'NRL', url: 'https://www.nrl.com' },
  ],
};
await writeFile(new URL('data/feed.json', ROOT), JSON.stringify(feed));
console.log(`feed.json: ${feed.events.length} events (${live.length} from ESPN), ${news.length} news`);
