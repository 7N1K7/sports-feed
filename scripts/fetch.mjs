// Builds data/feed.json from free sources plus hand-kept curated files.
// Run: node scripts/fetch.mjs   (Node 20+, no dependencies)
//
// Sources (all allow automated use; credited in the page footer)
//   Wikipedia (MediaWiki API)  -> fixtures and results from season pages listed in data/wiki-pages.json
//   TheSportsDB free API       -> A-League, NRL, Super Rugby rounds, next/last UFC event, team logos
//                                 and, fill only, final scores/start times Wikipedia lacks (RLWC, NPC, rugby tests)
//   RNZ sport RSS              -> news, tagged to teams by keyword
//   data/curated/*.json        -> fixtures the above lack (boxing, some tests), news, notes
//   data/broadcast.json        -> where-to-watch rules by competition
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { wikiEvents, tsdbEvents, tsdb, f1StartTimes } from './sources.mjs';
import { execSync } from 'node:child_process';

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
// Formula 1 circuit towns, as the season page's calendar names them
Object.assign(CITY_TZ, { Suzuka: 'Asia/Tokyo', Sakhir: 'Asia/Bahrain', Jeddah: 'Asia/Riyadh', 'Miami Gardens': 'America/New_York', Monaco: 'Europe/Monaco', 'Monte Carlo': 'Europe/Monaco', Montmeló: 'Europe/Madrid', Barcelona: 'Europe/Madrid', Madrid: 'Europe/Madrid', Spielberg: 'Europe/Vienna', Silverstone: 'Europe/London', Stavelot: 'Europe/Brussels', 'Spa-Francorchamps': 'Europe/Brussels', Mogyoród: 'Europe/Budapest', Budapest: 'Europe/Budapest', Zandvoort: 'Europe/Amsterdam', Monza: 'Europe/Rome', Imola: 'Europe/Rome', Austin: 'America/Chicago', Paradise: 'America/Los_Angeles', Lusail: 'Asia/Qatar', 'Yas Island': 'Asia/Dubai', 'Yas Marina': 'Asia/Dubai', Portimão: 'Europe/Lisbon', Istanbul: 'Europe/Istanbul', 'Le Castellet': 'Europe/Paris', Hockenheim: 'Europe/Berlin', Bahrain: 'Asia/Bahrain', Sepang: 'Asia/Kuala_Lumpur', 'Kuala Lumpur': 'Asia/Kuala_Lumpur' });
// cricket grounds' towns (tour pages often give the town alone, with no country)
for (const [tz, towns] of Object.entries({
  'Africa/Johannesburg': 'Gqeberha|Port Elizabeth|Centurion|Paarl|Bloemfontein|East London|Potchefstroom|Kimberley|Benoni|Stellenbosch',
  'Asia/Kolkata': 'Ahmedabad|Kolkata|Delhi|New Delhi|Bengaluru|Bangalore|Hyderabad|Pune|Rajkot|Dharamsala|Lucknow|Guwahati|Indore|Ranchi|Visakhapatnam|Nagpur|Mohali|Raipur|Thiruvananthapuram|Kanpur|Cuttack|Jaipur',
  'Europe/London': 'London|Birmingham|Manchester|Leeds|Nottingham|Southampton|Bristol|Chester-le-Street|Taunton|Hove|Canterbury, Kent',
  'Africa/Harare': 'Harare|Bulawayo', 'Asia/Colombo': 'Colombo|Galle|Kandy|Dambulla|Pallekele|Hambantota', 'Asia/Karachi': 'Karachi|Lahore|Rawalpindi|Multan|Faisalabad',
  'Asia/Dhaka': 'Dhaka|Mirpur|Chattogram|Chittagong|Sylhet', 'Asia/Dubai': 'Dubai|Abu Dhabi|Sharjah', 'Pacific/Auckland': 'Auckland|Tauranga|Hastings|Whanganui|Timaru|Lincoln|Taupō',
  'Australia/Brisbane': 'Mackay', 'Australia/Darwin': 'Alice Springs', 'Australia/Melbourne': 'Bendigo|Ballarat', 'Australia/Sydney': 'Coffs Harbour|Albury|Wollongong',
})) for (const t of towns.split('|')) if (!CITY_TZ[t]) CITY_TZ[t] = tz;
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
  ['f1', /Formula (One|1)\b|\bF1\b|Liam Lawson/i],
  ['wallabies', /Wallabies/], ['superrugby', /Super Rugby/i],
  ['rlwc', /Rugby League World Cup|\bRLWC\b/i], ['nrl', /\bNRL\b/],
  ['wbbl', /\bWBBL\b|Women's Big Bash/i], ['bbl', /\bBBL\b|Big Bash/i],
  ['phoenix', /Wellington Phoenix|\bPhoenix\b/], ['aucklandfc', /Auckland FC/i], ['aleague', /A-League/i], ['epl', /Premier League|\bEPL\b/],
  ['nzboxing', /Joseph Parker|David Nyika|Mea Motu|Lani Daniels|Andrei Mikhailovich/i],
  ['ufc', /\bUFC\b|\bMMA\b|Adesanya|Kara-France|Dan Hooker|Carlos Ulberg/i], ['boxing', /\bboxing\b|\bboxer\b|heavyweight title/i],
];
// Stories about an upcoming game that name no team above: match the names on the next fortnight's fixtures instead
// ("Volkanovski" -> ufc, "Arsenal" -> epl). Countries are left out, as they'd match half the sport section.
let EVENT_NAMES = [];
const teamFor = text => NEWS_TEAMS.find(([, re]) => re.test(text))?.[0] || EVENT_NAMES.find(([re]) => re.test(text))?.[1];
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
    const team = teamFor(title + ' ' + summary);
    if (!team) continue;
    const image = (m[1].match(/<(?:media:content|media:thumbnail|enclosure)[^>]*url="([^"]+)"/) || [])[1];
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

// NZ Herald sport headlines. Its RSS licence lets a website show the headlines exactly as received, each linked
// to the story and credited "supplied by nzherald.co.nz"; summaries and images are not covered, so neither is kept.
const HERALD_FEEDS = ['https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/sport/?outputType=xml&_website=nzh',
  ...['cricket', 'rugby-league', 'football', 'boxing', 'motorsport'].map(s => `https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/sport/${s}/?outputType=xml&_website=nzh`),
  'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/sport/rugby/?outputType=xml&_website=nzh'];
async function heraldNews() {
  const out = [], notes = [];
  for (const feedUrl of HERALD_FEEDS) {
    let xml;
    try {
      const r = await fetch(feedUrl, { headers: { 'user-agent': 'sports-feed (personal site)' }, signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw new Error(r.status);
      xml = await r.text();
    } catch (e) { notes.push(`${feedUrl.split('/section/')[1]?.split('/?')[0]}: error ${e.message}`); continue; }
    let n = 0;
    for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const get = tag => unxml((m[1].match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) || [])[1]);
      const title = get('title'), url = get('link');
      const team = teamFor(title);
      if (!team || !url || out.some(x => x.url === url)) continue;
      const d = new Date(get('pubDate'));
      out.push({
        id: 'nzh-' + url.split('/').filter(Boolean).slice(-2).join('-').slice(0, 80), team,
        date: isNaN(d) ? new Date(now).toISOString().slice(0, 10) : d.toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' }),
        kind: kindOf(title), title, summary: '', url, source: 'nzherald.co.nz', credit: 'Headline supplied by nzherald.co.nz', headlineOnly: true,
      });
      n++;
    }
    notes.push(`${feedUrl.split('/section/')[1]?.split('/?')[0]}: ${n} matching`);
  }
  diag.herald = notes.join('; ');
  return out;
}

// --- merge -------------------------------------------------------------
const ALIAS = [[/all blacks|black ferns|kiwi ferns|\bkiwis\b|white ferns|black ?caps/gi, 'new zealand'], [/wallabies|kangaroos|jillaroos|wallaroos/gi, 'australia'], [/springboks/gi, 'south africa'], [/pumas/gi, 'argentina']];
const norm = s => ALIAS.reduce((t, [re, to]) => t.replace(re, to), s || '').toLowerCase().replace(/women|bulls|stags|storm|pride|mako|steamers|heartland|rugby|the /g, '').replace(/[^a-z]/g, '');
// a final's date often moves once the semis are done (NPC: "weekend of 24/25 Oct", then Labour Day), so finals get a wider window
const stageOf = x => `${x.comp || ''} ${x.stage || ''}`, early = x => /semi|quarter|qualif|preliminary|elimination/i.test(stageOf(x));
const finalPair = (a, b) => (/\bfinal\b/i.test(stageOf(a)) || /\bfinal\b/i.test(stageOf(b))) && !early(a) && !early(b);
function sameMatch(a, b) {
  const tbc = a.timeTBC || b.timeTBC ? (finalPair(a, b) ? 3.5 : 2) * DAY : 8 * 36e5;
  if (Math.abs(new Date(a.startUTC) - new Date(b.startUTC)) > tbc) return false;
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
// Formula 1 start times from TheSportsDB, one weekend per run, remembered in .cache/f1-times.json
const f1Url = new URL('.cache/f1-times.json', ROOT);
let f1Cache = {};
try { f1Cache = JSON.parse(await readFile(f1Url, 'utf8')); } catch {}
await f1StartTimes(wiki, f1Cache, diag);
try { await mkdir(new URL('.cache/', ROOT), { recursive: true }); await writeFile(f1Url, JSON.stringify(f1Cache)); } catch {}
// TheSportsDB often rate-limits shared GitHub runners, so keep each league's last good pull for up to 3 days
const tsdbCacheUrl = new URL('.cache/tsdb-events.json', ROOT);
let tsdbCache = {};
try { tsdbCache = JSON.parse(await readFile(tsdbCacheUrl, 'utf8')); } catch {}

// same fixture from two sources? UFC cards match on date alone
const WOMEN_KEYS = new Set(['blackferns', 'whiteferns', 'kiwiferns', 'fpc', 'wbbl']);
const isW = e => WOMEN_KEYS.has(e.team) || /women|wheelchair/i.test([e.comp, e.home, e.away].join(' '));
const same = (a, b) => a.team === b.team && isW(a) === isW(b) && (a.team === 'ufc' ? Math.abs(new Date(a.startUTC) - new Date(b.startUTC)) < 1.5 * DAY : sameMatch(a, b));
const near = t => (a, b) => Math.abs(Date.parse(a.startUTC) - t) - Math.abs(Date.parse(b.startUTC) - t);

// Fill-only TheSportsDB leagues: which Wikipedia or curated cards could one complete? Men's games of its teams and
// competition that started 110 minutes to 12 hours ago with no score yet, or start within 2 days with no exact time.
// `known` = games the league already gave (cached), so a gap it has filled before costs no more calls.
const pre = [...curated.events, ...wiki];
function gapsFor(l, known) {
  const comp = new RegExp(l.fill.comp || '', 'i'), seen = new Set(), gaps = [];
  for (const e of pre) {
    if (seen.has(e) || e.sport !== l.sport || !(l.fill.teams || []).includes(e.team) || isW(e) || !comp.test(e.comp || '')) continue;
    const twins = pre.filter(x => x === e || same(x, e));
    twins.forEach(x => seen.add(x));
    const k = known.filter(x => same(e, x)).sort(near(Date.parse(e.startUTC)))[0];
    if (twins.some(x => x.score || x.status === 'final') || k?.score) continue;
    const timed = [...twins, k].find(x => x && !x.timeTBC);
    const age = now - Date.parse((timed || e).startUTC);
    if (timed ? age > 110 * 6e4 && age < 12 * 36e5 : age > 0 && age < 12 * 36e5) gaps.push({ e, need: 'score', known: k });
    else if (!timed && age <= 0 && age > -2 * DAY) gaps.push({ e, need: 'time', known: k });
  }
  return gaps;
}
const tsdbAll = await tsdbEvents(wikiCfg.thesportsdb, diag, tsdbCache, gapsFor);
try { await mkdir(new URL('.cache/', ROOT), { recursive: true }); await writeFile(tsdbCacheUrl, JSON.stringify(tsdbCache)); } catch {}
const tsdbLive = tsdbAll.filter(e => !e.fill), tsdbFill = tsdbAll.filter(e => e.fill);

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
  for (const k of ['progress', 'liveScore']) if (e[k]) hit[k] = e[k];
  if (e.card && /wikipedia/.test(e.source)) { hit.source = e.source; if (e.score) Object.assign(hit, { score: e.score, summary: e.summary, status: e.status }); }
}

const events = curated.events.map(e => ({ ...e }));
for (const le of live) {
  const hit = events.find(e => same(e, le));
  if (hit) {
    // live sources win on time, status and score; curated keeps names, notes and broadcast
    if (!le.timeTBC || hit.timeTBC) Object.assign(hit, { startUTC: le.startUTC, timeTBC: le.timeTBC });
    // ...except a placeholder ("Northland or SF2 winner" v "TBC") once the real teams and ground are known
    const ph = x => /\bor\b|winner|^TBC$/i.test(x || '');
    if ((ph(hit.home) || ph(hit.away)) && !ph(le.home) && !ph(le.away)) Object.assign(hit, { home: le.home, away: le.away, homeLogo: le.homeLogo, awayLogo: le.awayLogo });
    for (const k of ['venue', 'city']) if (/^TBC\b/.test(hit[k] || '') && le[k]) hit[k] = le[k];
    if (le.score) Object.assign(hit, { score: le.score, status: le.status, summary: le.summary || hit.summary });
    hit.tags = [...new Set([...(hit.tags || []), ...(le.tags || [])])];
    if (!hit.tz && le.tz) hit.tz = le.tz;
    if (!hit.link && le.link) hit.link = le.link;
    for (const k of ['card', 'squads', 'cricinfo']) if (!hit[k] && le[k]) hit[k] = le[k];
    if (le.weather) hit.weather = le.weather;
    for (const k of ['progress', 'liveScore']) if (le[k]) hit[k] = le[k];
    if (!hit.source && le.source) hit.source = le.source;
  } else events.push(le);
}
// Fill-only TheSportsDB games: a final score or exact start time for the closest matching card that lacks one, never a
// card of their own. TheSportsDB may list the sides the other way round, so the score is turned to face the card.
const side = (x, y) => { const a = norm(x), b = norm(y); return !!a && !!b && (a.includes(b) || b.includes(a)); };
const filled = [];
for (const t of tsdbFill) {
  const hit = events.filter(e => same(e, t)).sort(near(Date.parse(t.startUTC)))[0];
  if (!hit) continue;
  const did = [];
  if (hit.timeTBC && !t.timeTBC) { Object.assign(hit, { startUTC: t.startUTC, timeTBC: false }); did.push('start time'); }
  if (!hit.score && hit.status !== 'final' && t.status === 'final' && t.score) {
    const flip = (side(t.home, hit.away) && !side(t.home, hit.home)) || (side(t.away, hit.home) && !side(t.away, hit.away));
    Object.assign(hit, { score: flip ? t.score.split('-').reverse().join('-') : t.score, status: 'final' });
    did.push(`score ${hit.score}`);
  }
  if (did.length) filled.push(`${hit.home} v ${hit.away} (${hit.id}): ${did.join(', ')}`);
}
if (tsdbFill.length) diag.tsdbFilled = filled;
// a hand correction in the curated files ("fix") wins over every live source, for when a source has a score wrong
for (const e of events) if (e.fix) Object.assign(e, e.fix);
events.forEach(e => applyBroadcast(e, rules));
for (const e of events) if (!e.tz && e.city) { const bits = e.city.split(',').map(x => x.trim()); e.tz = tzFor(bits[0], bits[bits.length - 1]); }

const COUNTRY = /^(New Zealand|Australia|England|Scotland|Wales|Ireland|France|Italy|South Africa|Argentina|Japan|Fiji|Samoa|Tonga|Papua New Guinea|Cook Islands|India|Sri Lanka|Bangladesh|Pakistan|West Indies|Lebanon|Canada|USA|United States|Chile|Uruguay|Georgia|Portugal|Spain|Romania)( Women| A| XI| Wheelchair)?$/i;
const newsAll = [...curated.news];
{
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pairs = new Map();
  for (const e of events) {
    const age = now - Date.parse(e.startUTC);
    if (age > 2 * DAY || age < -14 * DAY) continue;
    const card = (e.card || []).slice(0, 4).flatMap(b => [b.a, b.b]).map(n => String(n || '').replace(/\s*\(c\)$/, ''));
    for (const n of [e.home, e.away, ...card]) {
      if (!n || n.length < 6 || /TBC|winner|^UFC|Fight Night|\bor\b/i.test(n) || COUNTRY.test(n)) continue;
      pairs.set(n, e.team);
      const last = n.split(' ').pop();
      if (/^(mma|boxing)$/.test(e.sport) && last.length >= 6) pairs.set(last, e.team);
    }
  }
  EVENT_NAMES = [...pairs].map(([n, t]) => [new RegExp(`\\b${esc(n)}\\b`), t]);
}
// RNZ's RSS terms say "for personal use only" (rnz.co.nz/rss); the owner chose to show it on this non-commercial site,
// with the feed's own summary and photo and a "Read at RNZ" link back. Set false to switch it off again
const RNZ_ON = true;
for (const n of [...(RNZ_ON ? await rnzNews() : []), ...await heraldNews()]) if (!newsAll.some(x => x.url === n.url || x.title === n.title)) newsAll.push(n);
const news = newsAll.filter(n => now - new Date(n.date) < 30 * DAY);

// Club logos from TheSportsDB's free API (badges used as-is, credited in the footer).
// Countries use flags in the page instead. Looked-up names are cached between runs.
// TheSportsDB labels union and league both "Rugby", so logos are matched within the right competitions only.
// Each code: the leagues whose team lists we pull, and which strLeague values a name search may accept.
const LOGO_CODES = {
  rugby: { leagues: ['Super Rugby', 'Super Rugby Pacific', 'Mitre 10 Cup', 'Bunnings NPC', 'NPC'], ok: /Super Rugby|Mitre 10|NPC|Provincial|Rugby Championship|Premiership Rugby|Top 14|United Rugby/i },
  league: { leagues: ['NRL', 'Australian National Rugby League'], ok: /NRL|Rugby League|Super League/i },
  football: { leagues: ['Australian A-League', 'Australian A-League Men'], ok: /A-League|Soccer|Football/i, sport: 'Soccer' },
  cricket: { leagues: ['Big Bash League', 'Womens Big Bash League', 'Super Smash', 'Plunket Shield', 'Ford Trophy'], ok: /Big Bash|Super Smash|Plunket|Ford Trophy|Cricket/i, sport: 'Cricket' },
};
const simple = n => String(n || '').toLowerCase().replace(/\b(fc|rugby|league|club|women|cricket)\b/g, '').replace(/[^a-z]/g, '');
async function addLogos(events, extra = []) {
  // badges that came with TheSportsDB fixtures (Premier League, A-League...): reuse them for that club everywhere
  const seen = {};
  for (const e of [...extra, ...events]) for (const [n, b] of [[e.home, e.homeLogo], [e.away, e.awayLogo]]) if (n && b) seen[`${e.sport}|${simple(n)}`] = b.replace(/\/tiny$/, '');
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
    if (seen[`${sport}|${simple(name)}`]) { found[key] = seen[`${sport}|${simple(name)}`]; continue; }
    const p = fromPool(sport, name);
    if (p) { found[key] = p; continue; }
    const c = cache.names[key];
    // misses are asked again every 3 days, as TheSportsDB keeps adding badges
    if (c && (c.b || now - c.t < 3 * DAY)) { found[key] = c.b; continue; }
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
    if (h && !e.homeLogo) e.homeLogo = h + '/tiny';
    if (a && !e.awayLogo) e.awayLogo = a + '/tiny';
  }
  // National men's sides keep their flag; their union's badge (when TheSportsDB has one) shows beside it.
  // From fixtures already pulled, else one name search each (a few a run, remembered for a month).
  const NAT = { rugby: [c => `${c} Rugby`, t => t.strSport === 'Rugby' && !/League/i.test(t.strLeague || '')], league: [c => `${c} Rugby League`, t => t.strSport === 'Rugby' && /League/i.test(`${t.strLeague} ${t.strTeam}`)],
    cricket: [c => c, t => t.strSport === 'Cricket'], football: [c => c, t => t.strSport === 'Soccer'] };
  cache.nat ||= {};
  let natLooked = 0;
  const natWant = new Map();
  for (const e of events) if (NAT[e.sport] && !isW(e)) for (const n of [e.home, e.away]) if (n && COUNTRY.test(n) && !/ (A|XI|Wheelchair|Women)$/i.test(n)) natWant.set(`${e.sport}|${n}`, [e.sport, n]);
  for (const [key, [sport, name]] of natWant) {
    const fromFix = seen[`${sport}|${simple(name)}`];
    if (fromFix) { cache.nat[key] = { t: now, b: fromFix }; continue; }
    const c = cache.nat[key];
    if (c && now - c.t < (c.b ? 30 : 3) * DAY) continue;
    if (natLooked >= 4) continue;
    natLooked++;
    try {
      const d = await tsdb(`searchteams.php?t=${encodeURIComponent(NAT[sport][0](name))}`);
      const t = (d.teams || []).find(t => NAT[sport][1](t) && simple(t.strTeam).startsWith(simple(name)) && !/women|u2\d|u1\d|sevens|7s|\bA\b|XI/i.test(t.strTeam));
      cache.nat[key] = { t: now, b: t ? (t.strBadge || t.strTeamBadge || null) : null };
    } catch { /* rate limited: next run */ }
  }
  for (const e of events) for (const side of ['home', 'away']) {
    const b = !isW(e) && cache.nat[`${e.sport}|${e[side]}`]?.b;
    if (b) e[side + 'Badge'] = b + '/tiny';
  }
  diag.natBadges = `${Object.values(cache.nat).filter(x => x.b).length} national badges; ${natLooked} searched this run`;
  diag.logos = `${Object.values(found).filter(Boolean).length}/${want.size} teams; ${looked} searched this run`;
  diag.logoLeagues = Object.fromEntries(Object.entries(cache.leagues).map(([k, v]) => [k, (v.teams || []).length]));
  try { await mkdir(new URL('.cache/', ROOT), { recursive: true }); await writeFile(cacheUrl, JSON.stringify(cache)); } catch {}
}

// Fighter headshots: each boxer's or UFC fighter's freely licensed photo from Wikipedia / Wikimedia Commons, with its
// credit. Only people Wikipedia or Commons describe as a fighter. Photos come from: the article's own free lead image;
// the photo on the fighter's Wikidata entry (always a Commons file, so free); "Name (fighter)" / "(boxer)" when the plain
// title is someone else; and every photo in the fighter's own Commons category, keeping the best headshot of the lot.
// Every fighter on a UFC card is looked up.
// Found photos are kept a month; fighters without one are asked again every 3 days, as photos keep being added.
async function addFaces(events) {
  const cacheUrl = new URL('.cache/faces.json', ROOT);
  let cache = {};
  try { cache = JSON.parse(await readFile(cacheUrl, 'utf8')); } catch {}
  // Wikimedia asks for a descriptive user agent and gentle pacing (it answered 429 to quick bursts), so a second between calls
  const UA = { headers: { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' } };
  const get = async (host, q) => { await new Promise(r => setTimeout(r, 1000)); const r = await fetch(`https://${host}/w/api.php?format=json&formatversion=2&maxlag=5&` + q, UA); if (!r.ok) throw new Error(`${host} ${r.status}`); return r.json(); };
  const plain = h => String(h || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  // "Alexander Volkanovski (c)" -> "Alexander Volkanovski"; "Saul 'Canelo' Alvarez" -> "Saul Alvarez"
  const strip = n => String(n || '').replace(/\s*\((c|ic)\)$/i, '').replace(/\s+['"‘“][^'"’”]+['"’”]\s+/, ' ').trim();
  const FIGHTER = /box|fight|martial|mma|kickbox|wrestl|judo|jiu|muay|sambo|karate|taekwondo/i;
  // nearest fights first, so they are looked up first
  const near = events.filter(e => /^(mma|boxing)$/.test(e.sport) && Math.abs(Date.parse(e.startUTC) - now) < 60 * DAY)
    .sort((x, y) => Math.abs(Date.parse(x.startUTC) - now) - Math.abs(Date.parse(y.startUTC) - now));
  // UFC cards are listed by surname ("Volkanovski vs. Evloev"); the fight card has the full names to look up
  const full = (e, side) => {
    const n = e[side], last = s => strip(s).split(/\s+/).pop().toLowerCase();
    const m = (e.card || []).flatMap(b => [b.a, b.b]).find(x => x && strip(x).includes(' ') && last(x) === last(n));
    return /\s/.test(n || '') || !m ? strip(n) : strip(m);
  };
  // a full name only: a lone surname (a far-off card with no bouts listed yet) would find the wrong page
  const ok = n => n && /\S\s+\S/.test(n) && !/TBC|TBA|^UFC|Fight Night|\bvs?\b|\d/i.test(n) && n.split(' ').length <= 4;
  const kindOf = {};
  for (const e of near) for (const n of [full(e, 'home'), full(e, 'away'), ...(Math.abs(Date.parse(e.startUTC) - now) < 30 * DAY ? (e.card || []).flatMap(b => [strip(b.a), strip(b.b)]) : [])])
    if (ok(n)) kindOf[n] ||= e.sport === 'boxing' ? 'boxer' : 'fighter';
  const names = Object.keys(kindOf);
  // 40 a run keeps each update quick (a second per call); the rest follow on the next runs, and the cache holds what was found
  const due = names.filter(n => !cache[n] || now - cache[n].t > (cache[n].src ? 30 : 3) * DAY || cache[n].v !== 5 || cache[n].why === 'not looked up').slice(0, 40);
  const found = {}, miss = {};
  try {
    // 1. the English article: free lead image, short description and Wikidata id; titles to retry as "Name (fighter)"
    const retry = [], qids = {}, lead = {};
    const look = async (titles, asked) => {
      for (let i = 0; i < titles.length; i += 20) {
        const batch = titles.slice(i, i + 20);
        const r = await get('en.wikipedia.org', 'action=query&prop=pageimages|description|pageprops&piprop=name&pilicense=free&ppprop=wikibase_item|disambiguation&redirects=1&titles=' + encodeURIComponent(batch.join('|')));
        const back = {};
        for (const m of [...(r.query?.normalized || []), ...(r.query?.redirects || [])]) back[m.to] = back[m.from] || m.from;
        for (const pg of r.query?.pages || []) {
          const t = back[pg.title] || pg.title, name = asked[t] || t;
          if (lead[name] || qids[name]) continue;
          const fighter = !pg.missing && !pg.pageprops?.disambiguation && FIGHTER.test(pg.description || '');
          if (fighter) { delete miss[name]; if (pg.pageimage) lead[name] = 'File:' + pg.pageimage; if (pg.pageprops?.wikibase_item) qids[name] = pg.pageprops.wikibase_item; }
          else if (!asked[t]) retry.push(name);
          if (!fighter || !pg.pageimage) miss[name] ||= pg.missing ? 'no article' : !fighter ? `not a fighter page (${pg.description || 'no description'})` : 'no free photo';
        }
      }
    };
    await look(due, {});
    const alt = {};
    for (const n of retry) alt[`${n} (${kindOf[n]})`] = n;
    await look(Object.keys(alt), alt);
    // 2. Wikidata: the fighter's chosen image (P18) and their own Commons category (P373)
    const byQ = Object.fromEntries(Object.entries(qids).map(([n, q]) => [q, n])), ids = Object.keys(byQ);
    const p18 = {}, p373 = {};
    for (let i = 0; i < ids.length; i += 40) {
      const r = await get('www.wikidata.org', 'action=wbgetentities&props=claims&ids=' + ids.slice(i, i + 40).join('|'));
      for (const [q, ent] of Object.entries(r.entities || {})) {
        const f = ent.claims?.P18?.[0]?.mainsnak?.datavalue?.value, cat = ent.claims?.P373?.[0]?.mainsnak?.datavalue?.value;
        if (f) p18[byQ[q]] = 'File:' + f;
        if (cat) p373[byQ[q]] = cat;
      }
    }
    // 3. every free photo of each fighter: the article's, Wikidata's, and the ones in their Commons category; then keep
    // the best headshot. A close crop, upright framing and a recent year score up; fight shots, face-offs, and photos
    // with other people score down. Commons is the source of each file's size, author and licence.
    const INFO = 'prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=240&iiextmetadatafilter=Artist|LicenseShortName|DateTimeOriginal|ImageDescription|Categories|ObjectName';
    const cands = {};
    const add = (n, pg, bonus) => { const ii = pg.imageinfo?.[0]; if (ii?.thumburl) (cands[n] ||= []).push({ title: pg.title, ii, bonus }); };
    const named = Object.fromEntries(due.flatMap(n => [[lead[n], [n, 1]], [p18[n], [n, 1]]]).filter(([f]) => f));
    const fl = Object.keys(named);
    for (let i = 0; i < fl.length; i += 40) {
      const r = await get('commons.wikimedia.org', `action=query&${INFO}&titles=` + encodeURIComponent(fl.slice(i, i + 40).join('|')));
      const back = {}; for (const m of r.query?.normalized || []) back[m.to] = m.from;
      for (const pg of r.query?.pages || []) { const k = named[back[pg.title] || pg.title]; if (k) add(k[0], pg, k[1]); }
    }
    const cs = { tried: 0, files: 0 };
    for (const n of due) {
      // a fighter's own category (from Wikidata) is theirs; "Category:<Name>" for someone with no article could be a
      // namesake's, so there a file must also name the fighter and say UFC, MMA or boxing
      const own = p373[n], guess = !own && !qids[n] && !lead[n];
      if (!own && !guess) continue;
      cs.tried++;
      const r = await get('commons.wikimedia.org', `action=query&generator=categorymembers&gcmtype=file&gcmlimit=40&${INFO}&gcmtitle=` + encodeURIComponent('Category:' + (own || n)));
      if (r.query?.pages?.length) cs.files++;
      const last = n.split(' ').pop().normalize('NFD').replace(/[^\w]/g, '').toLowerCase();
      for (const pg of r.query?.pages || []) {
        if (guess) {
          const md = pg.imageinfo?.[0]?.extmetadata || {}, about = plain(`${md.ImageDescription?.value || ''} ${md.Categories?.value || ''} ${md.ObjectName?.value || ''} ${pg.title}`);
          if (!about.normalize('NFD').replace(/[^\w\s]/g, '').toLowerCase().includes(last) || !(FIGHTER.test(about) || /\bUFC\b|Bellator|\bPFL\b|\bONE Championship/.test(about))) continue;
        }
        add(n, pg, 0);
      }
    }
    const score = ({ title, ii, bonus }) => {
      if (!/jpeg|png|webp/.test(ii.mime || '') || Math.min(ii.width, ii.height) < 200 || /\blogo\b|poster|belt\b|signature/i.test(title)) return -99;
      const r = ii.height / ii.width, md = ii.extmetadata || {};
      const year = +((`${title} ${plain(md.DateTimeOriginal?.value)}`.match(/\b(20[12]\d)\b/) || [])[1] || 0);
      return bonus + (r >= 1.15 ? 3 : r >= 0.85 ? 2 : r >= 0.6 ? 0 : -3)
        + (/crop|headshot|portrait|\bface\b|\bhead\b/i.test(title) ? 3 : 0)
        - (/\bvs?\.?\s|\bfight\b|\bbout\b|face.?off|press conference|\bwith\b|\band\b|&/i.test(title) ? 3 : 0)
        + (year >= 2015 ? Math.min(3, (year - 2015) * 0.3) : 0);
    };
    for (const n of due) {
      const best = (cands[n] || []).map(c => ({ c, s: score(c) })).filter(x => x.s > -50).sort((a, b) => b.s - a.s)[0];
      if (!best) continue;
      const { title, ii } = best.c, md = ii.extmetadata || {};
      found[n] = { src: ii.thumburl, file: title, ...(best.c.bonus ? {} : { from: 'commons category' }),
        credit: [plain(md.Artist?.value), plain(md.LicenseShortName?.value)].filter(Boolean).join(', ') + ' / Wikimedia Commons' };
      delete miss[n];
    }
    diag.facesCommons = `${cs.tried} categories tried, ${cs.files} had files`;
  } catch (e) { diag.facesError = e.message; }
  // only names that got an answer are cached; any left over by an error are tried again next run
  for (const n of due) if (found[n] || miss[n]) cache[n] = found[n] ? { t: now, v: 5, ...found[n] } : { t: now, v: 5, src: null, why: miss[n] };
  for (const e of near) {
    for (const side of ['home', 'away']) {
      const c = cache[full(e, side)];
      if (c?.src && !e[side + 'Logo']) { e[side + 'Logo'] = c.src; e[side + 'Credit'] = c.credit || 'Wikimedia Commons'; }
    }
    for (const b of e.card || []) for (const k of ['a', 'b']) {
      const c = cache[strip(b[k])];
      if (c?.src) { b[k + 'Img'] = c.src; b[k + 'Credit'] = c.credit || 'Wikimedia Commons'; }
    }
  }
  const have = names.filter(n => cache[n]?.src);
  diag.faces = `${have.length}/${names.length} fighters with a free photo (${have.filter(n => cache[n].from).length} from Commons categories); ${due.length} looked up`;
  diag.facesMissing = names.filter(n => !cache[n]?.src).map(n => `${n}: ${cache[n]?.v === 5 ? cache[n].why : 'not looked up yet'}`);
  try { await mkdir(new URL('.cache/', ROOT), { recursive: true }); await writeFile(cacheUrl, JSON.stringify(cache)); } catch {}
}

// Thumbnails: read each article's og:image once and remember it in .cache/og.json
async function addImages(items) {
  const cacheUrl = new URL('.cache/og.json', ROOT);
  let cache = {};
  try { cache = JSON.parse(await readFile(cacheUrl, 'utf8')); } catch {}
  const todo = items.filter(n => !n.image && !n.headlineOnly && n.url && !(n.url in cache)).slice(0, 40);
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
await addLogos(events, tsdbAll);
await addFaces(events);

// site version: the number of commits, and when the code last changed (needs the full git history in CI)
let site = null;
try { site = { version: +execSync('git rev-list --count HEAD').toString().trim(), changedAt: execSync('git log -1 --format=%cI').toString().trim() }; } catch {}

const feed = {
  generatedAt: new Date(now).toISOString(),
  ...(site ? { site } : {}),
  diag: { ...diag, liveSourceEvents: live.length, eventsByTeam: events.reduce((m, e) => (m[e.team] = (m[e.team] || 0) + 1, m), {}) },
  events: events.filter(e => now - new Date(e.startUTC) < 21 * DAY),
  news,
  tables,
  sources: [
    { name: 'Wikipedia (CC BY-SA)', url: 'https://en.wikipedia.org' }, { name: 'TheSportsDB', url: 'https://www.thesportsdb.com' }, ...(RNZ_ON ? [{ name: 'RNZ Sport', url: 'https://www.rnz.co.nz/news/sport' }] : []), { name: 'Headlines supplied by nzherald.co.nz', url: 'https://www.nzherald.co.nz/sport/' },
    { name: 'NZ Rugby', url: 'https://www.allblacks.com' }, { name: 'NZ Cricket', url: 'https://www.nzc.nz' },
    { name: 'NRL', url: 'https://www.nrl.com' },
  ],
};
await writeFile(new URL('data/feed.json', ROOT), JSON.stringify(feed));
// a small plain-text view of games around now, for checking the live site without reading the whole feed
await writeFile(new URL('data/now.txt', ROOT), feed.events.filter(e => Math.abs(Date.parse(e.startUTC) - now) < 2 * DAY)
  .map(e => [e.id, e.team, e.status, e.startUTC, e.timeTBC ? 'TBC' : '', e.format || '', e.stage || '', e.city || '', e.tz || '', e.score || '', e.summary || '', e.weather || '', e.progress || '', e.liveScore || ''].join(' | ')).join('\n') + '\n');

// "hot" while a game is on or about to start (Tests count for five days), so the workflow refreshes every
// 10 minutes then and only now and again otherwise, sparing Wikipedia and TheSportsDB needless requests
const hot = feed.events.some(e => {
  if (e.status === 'final') return false;
  const age = now - new Date(e.startUTC);
  const span = e.sport === 'cricket' && /\bTests?\b/.test(`${e.stage || ''} ${e.comp || ''}`) ? 5 * DAY : 12 * 36e5;
  return age > -90 * 6e4 && age < span;
});
// "live": a game in its playing window right now (for a Test, the first 10 hours of each day), so refresh every 5 minutes
const PLAY_H = { rugby: 2.5, league: 2.5, football: 2.5, mma: 6, boxing: 5, motor: 3 };
const playing = feed.events.some(e => {
  if (e.status === 'final') return false;
  const age = now - new Date(e.startUTC);
  if (age < -15 * 6e4) return false;
  if (e.sport === 'cricket') {
    const test = /\bTests?\b/.test(`${e.stage || ''} ${e.comp || ''}`);
    return test ? age < 5 * DAY && age % DAY < 10 * 36e5 : age < (/\bT20/.test(`${e.format || ''} ${e.stage || ''}`) ? 4.5 : 9.5) * 36e5;
  }
  return age < (PLAY_H[e.sport] || 3) * 36e5;
});
if (process.env.GITHUB_OUTPUT) await writeFile(process.env.GITHUB_OUTPUT, `hot=${hot}\nevery=${playing ? 300 : 600}\n`, { flag: 'a' });
console.log(playing ? 'A game is being played: next refresh in 5 minutes' : hot ? 'Games on or starting soon: next refresh in 10 minutes' : 'Nothing on: next refresh on the slower schedule');
console.log(`feed.json: ${feed.events.length} events (${wiki.length} from Wikipedia, ${tsdbLive.length} from TheSportsDB), ${news.length} news`);
