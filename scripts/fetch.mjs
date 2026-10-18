// Builds data/feed.json from free sources plus hand-kept curated files.
// Run: node scripts/fetch.mjs   (Node 20+, no dependencies)
//
// Sources (all allow automated use; credited in the page footer)
//   Wikipedia (MediaWiki API)  -> fixtures and results from season pages listed in data/wiki-pages.json
//   TheSportsDB free API       -> A-League, NRL, Super Rugby rounds, next/last UFC event, team logos
//   RNZ sport RSS              -> news, tagged to teams by keyword
//   data/curated/*.json        -> fixtures the above lack (boxing, some tests), news, notes
//   data/broadcast.json        -> where-to-watch rules by competition
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { wikiEvents, tsdbEvents, tsdb } from './sources.mjs';

const ROOT = new URL('../', import.meta.url);
const DAY = 864e5;
const now = Date.now();
const diag = {}; // per-source health, written into feed.json

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
Object.assign(COUNTRY_TZ, { 'U.S.': 'America/New_York', 'United States of America': 'America/New_York', Qatar: 'Asia/Qatar', 'Saudi Arabia': 'Asia/Riyadh', 'United Arab Emirates': 'Asia/Dubai', Brazil: 'America/Sao_Paulo', Mexico: 'America/Mexico_City', China: 'Asia/Shanghai', Singapore: 'Asia/Singapore', Azerbaijan: 'Asia/Baku', Kazakhstan: 'Asia/Almaty', Germany: 'Europe/Berlin', Netherlands: 'Europe/Amsterdam', Pakistan: 'Asia/Karachi', India: 'Asia/Kolkata', 'Sri Lanka': 'Asia/Colombo', Bangladesh: 'Asia/Dhaka', 'West Indies': 'America/Barbados', Zimbabwe: 'Africa/Harare', 'Cook Islands': 'Pacific/Rarotonga' });
Object.assign(CITY_TZ, { 'Al Rayyan': 'Asia/Qatar', Doha: 'Asia/Qatar', 'New York City': 'America/New_York', 'Salt Lake City': 'America/Denver', Nashville: 'America/Chicago', Atlanta: 'America/New_York', Boston: 'America/New_York', Philadelphia: 'America/New_York', Baku: 'Asia/Baku', Christchurch: 'Pacific/Auckland', Wellington: 'Pacific/Auckland', Hamilton: 'Pacific/Auckland', Dunedin: 'Pacific/Auckland', 'Mount Maunganui': 'Pacific/Auckland', Napier: 'Pacific/Auckland', Nelson: 'Pacific/Auckland', Whangārei: 'Pacific/Auckland', Whangarei: 'Pacific/Auckland', Invercargill: 'Pacific/Auckland', 'New Plymouth': 'Pacific/Auckland', 'Palmerston North': 'Pacific/Auckland', Queenstown: 'Pacific/Auckland', Rotorua: 'Pacific/Auckland', Geelong: 'Australia/Melbourne', Launceston: 'Australia/Hobart', Cairns: 'Australia/Brisbane', Chennai: 'Asia/Kolkata', Mumbai: 'Asia/Kolkata', 'Cape Town': 'Africa/Johannesburg', Johannesburg: 'Africa/Johannesburg', Pretoria: 'Africa/Johannesburg', Durban: 'Africa/Johannesburg', Dublin: 'Europe/Dublin', Cardiff: 'Europe/London', Edinburgh: 'Europe/London', Rome: 'Europe/Rome', Marseille: 'Europe/Paris', 'Buenos Aires': 'America/Argentina/Buenos_Aires', Rarotonga: 'Pacific/Rarotonga', "Nuku'alofa": 'Pacific/Tongatapu' });
const tzFor = (city = '', country = '') => CITY_TZ[city] || COUNTRY_TZ[country] || null;


async function getJSON(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'sports-feed (personal site)' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
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
const wikiCfg = JSON.parse(await readFile(new URL('data/wiki-pages.json', ROOT), 'utf8'));
let wiki = [];
let tables = [];
try { wiki = await wikiEvents(wikiCfg.pages, n => tzFor(n, n), diag); tables = wiki.tables || []; } catch (e) { console.warn('Wikipedia failed:', e.message); diag.wikipedia = 'error: ' + e.message; }
// TheSportsDB often rate-limits shared GitHub runners, so keep each league's last good pull for up to 3 days
const tsdbCacheUrl = new URL('.cache/tsdb-events.json', ROOT);
let tsdbCache = {};
try { tsdbCache = JSON.parse(await readFile(tsdbCacheUrl, 'utf8')); } catch {}
const tsdbLive = await tsdbEvents(wikiCfg.thesportsdb, diag, tsdbCache);
try { await mkdir(new URL('.cache/', ROOT), { recursive: true }); await writeFile(tsdbCacheUrl, JSON.stringify(tsdbCache)); } catch {}

// same fixture from two sources? UFC cards match on date alone
const WOMEN_KEYS = new Set(['blackferns', 'whiteferns', 'kiwiferns', 'fpc', 'wbbl']);
const isW = e => WOMEN_KEYS.has(e.team) || /women|wheelchair/i.test([e.comp, e.home, e.away].join(' '));
const same = (a, b) => a.team === b.team && isW(a) === isW(b) && (a.team === 'ufc' ? Math.abs(new Date(a.startUTC) - new Date(b.startUTC)) < 1.5 * DAY : sameMatch(a, b));
// TheSportsDB has exact times; Wikipedia has scores for more competitions. Merge both, then onto curated.
const live = [];
for (const e of [...tsdbLive, ...wiki]) {
  const hit = live.find(x => same(x, e));
  if (!hit) { live.push(e); continue; }
  if (hit.timeTBC && !e.timeTBC) Object.assign(hit, { startUTC: e.startUTC, timeTBC: false });
  if (!hit.score && e.score) Object.assign(hit, { score: e.score, status: e.status, summary: e.summary });
  if (/^TBC$/.test(hit.away) && e.away !== 'TBC') Object.assign(hit, { home: e.home, away: e.away });
  for (const k of ['venue', 'city', 'tz', 'link', 'card', 'squads', 'cricinfo']) if (!hit[k] && e[k]) hit[k] = e[k];
  if (e.weather) hit.weather = e.weather;
  if (e.card && /wikipedia/.test(e.source)) { hit.source = e.source; if (e.score) Object.assign(hit, { score: e.score, summary: e.summary, status: e.status }); }
}

const events = curated.events.map(e => ({ ...e }));
for (const le of live) {
  const hit = events.find(e => same(e, le));
  if (hit) {
    // live sources win on time, status and score; curated keeps names, notes and broadcast
    if (!le.timeTBC || hit.timeTBC) Object.assign(hit, { startUTC: le.startUTC, timeTBC: le.timeTBC });
    if (le.score) Object.assign(hit, { score: le.score, status: le.status, summary: le.summary || hit.summary });
    hit.tags = [...new Set([...(hit.tags || []), ...(le.tags || [])])];
    if (!hit.tz && le.tz) hit.tz = le.tz;
    if (!hit.link && le.link) hit.link = le.link;
    for (const k of ['card', 'squads', 'cricinfo']) if (!hit[k] && le[k]) hit[k] = le[k];
    if (le.weather) hit.weather = le.weather;
    if (!hit.source && le.source) hit.source = le.source;
  } else events.push(le);
}
events.forEach(e => applyBroadcast(e, rules));
for (const e of events) if (!e.tz && e.city) { const bits = e.city.split(',').map(x => x.trim()); e.tz = tzFor(bits[0], bits[bits.length - 1]); }

const newsAll = [...curated.news];
for (const n of await rnzNews()) if (!newsAll.some(x => x.url === n.url || x.title === n.title)) newsAll.push(n);
const news = newsAll.filter(n => now - new Date(n.date) < 30 * DAY);

// Club logos from TheSportsDB's free API (badges used as-is, credited in the footer).
// Countries use flags in the page instead. Looked-up names are cached between runs.
const COUNTRY = /^(New Zealand|Australia|England|Scotland|Wales|Ireland|France|Italy|South Africa|Argentina|Japan|Fiji|Samoa|Tonga|Papua New Guinea|Cook Islands|India|Sri Lanka|Bangladesh|Pakistan|West Indies|Lebanon|Canada|USA|United States|Chile|Uruguay|Georgia|Portugal|Spain|Romania)( Women| A| XI| Wheelchair)?$/i;
// TheSportsDB labels union and league both "Rugby", so logos are matched within the right competitions only.
// Each code: the leagues whose team lists we pull, and which strLeague values a name search may accept.
const LOGO_CODES = {
  rugby: { leagues: ['Super Rugby', 'Super Rugby Pacific', 'Mitre 10 Cup', 'Bunnings NPC', 'NPC'], ok: /Super Rugby|Mitre 10|NPC|Provincial|Rugby Championship|Premiership Rugby|Top 14|United Rugby/i },
  league: { leagues: ['NRL', 'Australian National Rugby League'], ok: /NRL|Rugby League|Super League/i },
  football: { leagues: ['Australian A-League', 'Australian A-League Men'], ok: /A-League|Soccer|Football/i, sport: 'Soccer' },
  cricket: { leagues: ['Big Bash League', 'Womens Big Bash League', 'Super Smash', 'Plunket Shield', 'Ford Trophy'], ok: /Big Bash|Super Smash|Plunket|Ford Trophy|Cricket/i, sport: 'Cricket' },
};
const simple = n => String(n || '').toLowerCase().replace(/\b(fc|rugby|league|club|women|cricket)\b/g, '').replace(/[^a-z]/g, '');
async function addLogos(events) {
  const cacheUrl = new URL('.cache/logos4.json', ROOT);
  let cache = { leagues: {}, names: {} };
  try { cache = JSON.parse(await readFile(cacheUrl, 'utf8')); } catch {}
  const WEEK = 7 * DAY;
  for (const code of Object.values(LOGO_CODES)) for (const l of code.leagues) {
    if (cache.leagues[l] && now - cache.leagues[l].t < WEEK) continue;
    try {
      const d = await tsdb(`search_all_teams.php?l=${encodeURIComponent(l)}`);
      cache.leagues[l] = { t: now, teams: (d.teams || []).map(t => ({ n: [t.strTeam, t.strTeamAlternate, t.strTeamShort].filter(Boolean).join('|'), b: t.strBadge || t.strTeamBadge })).filter(t => t.b) };
    } catch { /* rate limited or down: try again next run */ }
  }
  // exact name match within the code's own leagues, then "starts with" (Taranaki -> Taranaki Bulls), never across codes
  const fromPool = (sport, name) => {
    const k = simple(name), pool = LOGO_CODES[sport].leagues.flatMap(l => cache.leagues[l]?.teams || []);
    if (!k) return null;
    const names = t => t.n.split('|').map(simple);
    const hit = pool.find(t => names(t).includes(k)) || (k.length > 4 && pool.find(t => names(t).some(y => y.length > 4 && (y.startsWith(k) || k.startsWith(y)))));
    return hit ? hit.b : null;
  };
  const want = new Map();
  for (const e of events) {
    if (!LOGO_CODES[e.sport]) continue;
    for (const n of [e.home, e.away]) if (n && !/TBC|winner|^Northland or|Northern \d|Southern \d/i.test(n) && !COUNTRY.test(n)) want.set(`${e.sport}|${n}`, [e.sport, n]);
  }
  let looked = 0;
  const found = {};
  for (const [key, [sport, name]] of want) {
    const p = fromPool(sport, name);
    if (p) { found[key] = p; continue; }
    const c = cache.names[key];
    if (c && (c.b || now - c.t < WEEK)) { found[key] = c.b; continue; }
    if (looked >= 10) continue;
    looked++;
    let b = null, failed = false;
    for (const q of [...new Set([name, name.replace(/\s+(FC|Bulls|Stags|Mako|Steamers|Pride|Storm|Women)$/i, '')])]) {
      try {
        const d = await tsdb(`searchteams.php?t=${encodeURIComponent(q)}`);
        const code = LOGO_CODES[sport];
        const t = (d.teams || []).find(t => (code.sport ? t.strSport === code.sport : t.strSport === 'Rugby') && code.ok.test(t.strLeague || '') && simple(t.strTeam).startsWith(simple(q).slice(0, 5)));
        b = t && (t.strBadge || t.strTeamBadge) || null;
      } catch { failed = true; }
      if (b) break;
    }
    if (failed) continue;
    cache.names[key] = { t: now, b };
    found[key] = b;
  }
  for (const e of events) {
    const h = found[`${e.sport}|${e.home}`], a = found[`${e.sport}|${e.away}`];
    if (h) e.homeLogo = h + '/tiny';
    if (a) e.awayLogo = a + '/tiny';
  }
  diag.logos = `${Object.values(found).filter(Boolean).length}/${want.size} teams; ${looked} searched this run`;
  diag.logoLeagues = Object.fromEntries(Object.entries(cache.leagues).map(([k, v]) => [k, (v.teams || []).length]));
  try { await mkdir(new URL('.cache/', ROOT), { recursive: true }); await writeFile(cacheUrl, JSON.stringify(cache)); } catch {}
}

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
await addLogos(events);

const feed = {
  generatedAt: new Date(now).toISOString(),
  diag: { ...diag, liveSourceEvents: live.length, eventsByTeam: events.reduce((m, e) => (m[e.team] = (m[e.team] || 0) + 1, m), {}) },
  events: events.filter(e => now - new Date(e.startUTC) < 21 * DAY),
  news,
  tables,
  sources: [
    { name: 'Wikipedia (CC BY-SA)', url: 'https://en.wikipedia.org' }, { name: 'TheSportsDB', url: 'https://www.thesportsdb.com' }, { name: 'RNZ Sport', url: 'https://www.rnz.co.nz/news/sport' },
    { name: 'NZ Rugby', url: 'https://www.allblacks.com' }, { name: 'NZ Cricket', url: 'https://www.nzc.nz' },
    { name: 'NRL', url: 'https://www.nrl.com' },
  ],
};
await writeFile(new URL('data/feed.json', ROOT), JSON.stringify(feed));
console.log(`feed.json: ${feed.events.length} events (${wiki.length} from Wikipedia, ${tsdbLive.length} from TheSportsDB), ${news.length} news`);
