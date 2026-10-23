// Builds data/feed.json from free sources plus hand-kept curated files.
// Run: node scripts/fetch.mjs   (Node 20+, no dependencies)
//
// Sources (all allow automated use; credited in the page footer)
//   Wikipedia (MediaWiki API)  -> fixtures and results from season pages listed in data/wiki-pages.json
//   TheSportsDB free API       -> A-League, NRL, Super Rugby rounds, next/last UFC event, team logos
//                                 and, fill only, final scores/start times Wikipedia lacks (RLWC, NPC, rugby tests)
//   RNZ sport RSS              -> off (its terms don't allow it on a website); kept for if RNZ gives permission
//   data/curated/*.json        -> fixtures the above lack (boxing, some tests), news, notes
//   data/broadcast.json        -> where-to-watch rules by competition
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { wikiEvents, tsdbEvents, tsdb, f1StartTimes, supercarsStartTimes, nbaGames, stateSquads, teamSquads } from './sources.mjs';
import { rankings as getRankings, KIWI_GOLF } from './rankings.mjs';
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
// basketball: NBL towns and the Asia-Oceania World Cup qualifiers' cities
Object.assign(CITY_TZ, { Wollongong: 'Australia/Sydney', Launceston: 'Australia/Hobart', Launcerston: 'Australia/Hobart', Manila: 'Asia/Manila', 'Pasay': 'Asia/Manila', 'Quezon City': 'Asia/Manila', Seoul: 'Asia/Seoul', Anyang: 'Asia/Seoul', Beirut: 'Asia/Beirut', Taipei: 'Asia/Taipei', 'New Taipei': 'Asia/Taipei',
  Jakarta: 'Asia/Jakarta', Tehran: 'Asia/Tehran', Amman: 'Asia/Amman', Manama: 'Asia/Bahrain', Isa: 'Asia/Bahrain', Almaty: 'Asia/Almaty', Astana: 'Asia/Almaty', Ulaanbaatar: 'Asia/Ulaanbaatar', Bangkok: 'Asia/Bangkok',
  Hagåtña: 'Pacific/Guam', Guam: 'Pacific/Guam', Mangilao: 'Pacific/Guam', Zhuji: 'Asia/Shanghai', Shenzhen: 'Asia/Shanghai', Jiangmen: 'Asia/Shanghai', Beijing: 'Asia/Shanghai', Okinawa: 'Asia/Tokyo', Chiba: 'Asia/Tokyo', Damascus: 'Asia/Damascus', Baghdad: 'Asia/Baghdad', Dubai: 'Asia/Dubai' });
// Australian domestic sides (Sheffield Shield, Dean Jones Trophy) play at home in their state's time zone
Object.assign(CITY_TZ, { Queensland: 'Australia/Brisbane', 'New South Wales': 'Australia/Sydney', Victoria: 'Australia/Melbourne', 'South Australia': 'Australia/Adelaide', 'Western Australia': 'Australia/Perth', Tasmania: 'Australia/Hobart' });
Object.assign(CITY_TZ, { Edmonton: 'America/Edmonton', Calgary: 'America/Edmonton', Vancouver: 'America/Vancouver', Montreal: 'America/Toronto', Gosford: 'Australia/Sydney', 'New South Wales': 'Australia/Sydney', Victoria: 'Australia/Melbourne', Queensland: 'Australia/Brisbane', 'Las Vegas': 'America/Los_Angeles', 'Los Angeles': 'America/Los_Angeles', 'New York': 'America/New_York', Newark: 'America/New_York', Miami: 'America/New_York', Houston: 'America/Chicago', Chicago: 'America/Chicago', Denver: 'America/Denver', 'Abu Dhabi': 'Asia/Dubai', Riyadh: 'Asia/Riyadh', London: 'Europe/London', Paris: 'Europe/Paris', 'Mexico City': 'America/Mexico_City', 'Rio de Janeiro': 'America/Sao_Paulo', 'São Paulo': 'America/Sao_Paulo', Singapore: 'Asia/Singapore', Shanghai: 'Asia/Shanghai', Macau: 'Asia/Macau', Toronto: 'America/Toronto', Perth: 'Australia/Perth', Auckland: 'Pacific/Auckland' });
Object.assign(COUNTRY_TZ, { 'U.S.': 'America/New_York', 'United States of America': 'America/New_York', Qatar: 'Asia/Qatar', 'Saudi Arabia': 'Asia/Riyadh', 'United Arab Emirates': 'Asia/Dubai', Brazil: 'America/Sao_Paulo', Mexico: 'America/Mexico_City', China: 'Asia/Shanghai', Singapore: 'Asia/Singapore', Azerbaijan: 'Asia/Baku', Kazakhstan: 'Asia/Almaty', Germany: 'Europe/Berlin', Netherlands: 'Europe/Amsterdam', Pakistan: 'Asia/Karachi', India: 'Asia/Kolkata', 'Sri Lanka': 'Asia/Colombo', Bangladesh: 'Asia/Dhaka', 'West Indies': 'America/Barbados', Zimbabwe: 'Africa/Harare', 'Cook Islands': 'Pacific/Rarotonga' });
// hockey grounds: the Pro League, World Cup and Nations Cup towns
Object.assign(CITY_TZ, { Amstelveen: 'Europe/Amsterdam', Wavre: 'Europe/Brussels', Antwerp: 'Europe/Brussels', Eindhoven: 'Europe/Amsterdam', Utrecht: 'Europe/Amsterdam', Terrassa: 'Europe/Madrid', Valencia: 'Europe/Madrid', Krefeld: 'Europe/Berlin', Mannheim: 'Europe/Berlin', Bhubaneswar: 'Asia/Kolkata', Rourkela: 'Asia/Kolkata', Changzhou: 'Asia/Shanghai', Hangzhou: 'Asia/Shanghai', Santiago: 'America/Santiago', 'Córdoba': 'America/Argentina/Cordoba', Hobart: 'Australia/Hobart', Kuala: 'Asia/Kuala_Lumpur', 'Kuala Lumpur': 'Asia/Kuala_Lumpur', Ipoh: 'Asia/Kuala_Lumpur', Muscat: 'Asia/Muscat' });
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
  ['blackcaps', /Black ?Caps/i], ['whiteferns', /White Ferns/i], ['nzdomestic', /Plunket Shield|Ford Trophy|Super Smash|Hallyburton/i], ['audomestic', /Sheffield Shield|Dean Jones Trophy|One-Day Cup/i],
  ['kiwis', /\bKiwis\b/], ['kiwiferns', /Kiwi Ferns/i], ['warriors', /(?<!Golden State )\bWarriors\b/],
  ['blacksticksw', /Black Sticks Women|Black Sticks women/i], ['blacksticks', /Black Sticks/i],
  ['tallferns', /Tall Ferns/i], ['tallblacks', /Tall Blacks/i], ['breakers', /\bBreakers\b/], ['nbl', /\bNBL\b/], ['silverferns', /Silver Ferns/i], ['anzprem', /ANZ Premiership/i],
  ['f1', /Formula (One|1)\b|\bF1\b|Liam Lawson/i], ['supercars', /Supercars|Bathurst 1000/i],
  ['wallabies', /Wallabies/], ['superrugby', /Super Rugby/i],
  ['rlwc', /Rugby League World Cup|\bRLWC\b/i], ['nrl', /\bNRL\b/],
  ['wbbl', /\bWBBL\b|Women's Big Bash/i], ['bbl', /\bBBL\b|Big Bash/i],
  ['phoenix', /Wellington Phoenix|\bPhoenix\b/], ['aucklandfc', /Auckland FC/i], ['aleague', /A-League/i], ['epl', /Premier League|\bEPL\b/],
  ['nzboxing', /Joseph Parker|David Nyika|Mea Motu|Lani Daniels|Andrei Mikhailovich/i],
  ['ufc', /\bUFC\b|\bMMA\b|Adesanya|Kara-France|Dan Hooker|Carlos Ulberg/i], ['boxing', /\bboxing\b|\bboxer\b|heavyweight title/i],
  ['npb', /Japan Series|\bNPB\b|Nippon Professional Baseball/i], ['mlb', /\bMLB\b|Major League Baseball/], ['nba', /\bNBA\b|Steven Adams/],
  // golf: the women's tour by name or its players, the Australasian tour's events, and the rest of golf under the PGA Tour
  ['lpga', /\bLPGA\b|Lydia Ko|Nelly Korda|Solheim Cup/i], ['golfanz', /PGA Tour of Australasia|New Zealand Open|NZ Open\b|Australian PGA|NZ PGA/i],
  ['pgatour', /\bPGA Tour\b|FedEx Cup|Ryan Fox|Daniel Hillier|Kazuma Kobori|Scheffler|McIlroy|Ryder Cup|\bThe Masters\b|\bLIV\b|\bgolf(er|ers)?\b/i],
];
// the NBA's and MLB's teams by their short names, for the basketball and baseball feeds (where "Heat" or "Giants" can only
// mean the one team)
const NBA_NICK = /\b(Hawks|Celtics|Nets|Hornets|Bulls|Cavaliers|Cavs|Mavericks|Mavs|Nuggets|Pistons|Warriors|Rockets|Pacers|Clippers|Lakers|Grizzlies|Heat|Bucks|Timberwolves|Pelicans|Knicks|Thunder|Magic|76ers|Sixers|Suns|Trail Blazers|Blazers|Kings|Spurs|Raptors|Jazz|Wizards|LeBron|Giannis)\b/;
const MLB_NICK = /\b(World Series|ALCS|NLCS|ALDS|NLDS|Yankees|Red Sox|Dodgers|Brewers|Rays|Guardians|Mets|Cubs|Astros|Braves|Padres|Phillies|Mariners|Blue Jays|Orioles|Twins|Royals|White Sox|Rangers|Angels|Athletics|Giants|Diamondbacks|Rockies|Reds|Pirates|Cardinals|Marlins|Nationals|Ohtani)\b/;
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
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
  // numbered characters too ("Pistons&#8217;" in a feed that escapes its apostrophes twice)
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).trim();

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
  ...['cricket', 'rugby-league', 'football', 'boxing', 'motorsport', 'golf'].map(s => `https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/sport/${s}/?outputType=xml&_website=nzh`),
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
      const d = new Date(get('pubDate'));
      if (url && !isNaN(d)) HEADLINES.push({ title, at: d.toISOString() });
      if (/\/cricket\//.test(feedUrl) && url && !isNaN(d)) CRICKET_HEADLINES.push({ title, url, at: d.toISOString(), credit: 'Headline supplied by nzherald.co.nz' });
      const team = teamFor(title);
      if (!team || !url || out.some(x => x.url === url)) continue;
      out.push({
        id: 'nzh-' + url.split('/').filter(Boolean).slice(-2).join('-').slice(0, 80), team,
        date: isNaN(d) ? new Date(now).toISOString().slice(0, 10) : d.toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' }),
        kind: kindOf(title), title, summary: '', url, source: 'nzherald.co.nz', credit: 'Headline supplied by nzherald.co.nz', headlineOnly: true, ...(isNaN(d) ? {} : { at: d.toISOString() }),
      });
      n++;
    }
    notes.push(`${feedUrl.split('/section/')[1]?.split('/?')[0]}: ${n} matching`);
  }
  diag.herald = notes.join('; ');
  return out;
}

// Scoop.co.nz: NZ press releases, free to reproduce for non-commercial use with Scoop credited (scoop.co.nz/about/terms.html
// 3.1.1). It has no sport feed of its own; sport releases (Silver Ferns, Kiwi Ferns, the codes' own announcements) come
// through the Culture feed, kept here when they name one of our teams
const SCOOP_FEEDS = ['https://www.scoop.co.nz/storyindex/index.rss?s.c=CU', 'https://www.scoop.co.nz/storyindex/index.rss?s.c=SP'];
async function scoopNews() {
  const out = [], notes = [];
  for (const feedUrl of SCOOP_FEEDS) {
    let xml;
    try {
      const r = await fetch(feedUrl, { headers: { 'user-agent': 'sports-feed (personal non-commercial site)' }, signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw new Error(r.status);
      xml = await r.text();
    } catch (e) { notes.push(`${feedUrl.split('=').pop()}: error ${e.message}`); continue; }
    let n = 0, all = 0;
    for (const m of xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/g)) {
      all++;
      const raw = tag => (m[1].match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) || [])[1] || '';
      const title = unxml(raw('title')), url = unxml(raw('link')), body = raw('description');
      const summary = unxml(body.replace(/&lt;/g, '<').replace(/&gt;/g, '>')).replace(/\s+/g, ' ');
      const team = teamFor(title + ' ' + summary);
      { const d = new Date(unxml(raw('pubDate')) || unxml(raw('dc:date'))); if (!isNaN(d)) HEADLINES.push({ title: `${title} ${summary}`, at: d.toISOString() }); }
      if (!team || !url || out.some(x => x.url === url)) continue;
      const image = (m[1].match(/<(?:media:content|media:thumbnail|enclosure)[^>]*url="([^"]+)"/) || body.replace(/&lt;/g, '<').replace(/&quot;/g, '"').match(/<img[^>]*src="([^"]+)"/) || [])[1];
      const d = new Date(unxml(raw('pubDate')) || unxml(raw('dc:date')));
      out.push({
        id: 'scoop-' + url.split('/').filter(Boolean).slice(-1)[0].replace(/\W+/g, '-').slice(0, 80), team,
        date: isNaN(d) ? new Date(now).toISOString().slice(0, 10) : d.toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' }),
        kind: kindOf(title + ' ' + summary), title, summary: summary.slice(0, 280), url, source: 'Scoop', ...(image ? { image: image.replace(/^http:/, 'https:') } : {}),
      });
      n++;
    }
    notes.push(`${feedUrl.split('=').pop()}: ${n} of ${all} matching`);
  }
  diag.scoop = notes.join('; ') + (out[0] ? ` | e.g. ${out[0].title} [${out[0].team}] img=${out[0].image ? 'yes' : 'no'}` : '');
  return out;
}

// Fight news: NZ outlets rarely cover UFC or world boxing, so headlines come from the specialist sites' public RSS
// feeds too. Headline and link only (as with the Herald), the newest few that are about a UFC or boxing card we list
const FIGHT_FEEDS = [
  ['MMA Fighting', 'mmafighting.com', 'https://www.mmafighting.com/rss/index.xml'],
  ['MMA Mania', 'mmamania.com', 'https://www.mmamania.com/rss/index.xml'],
  ['Bad Left Hook', 'badlefthook.com', 'https://www.badlefthook.com/rss/index.xml'],
];
// The NBA and MLB the same way, from SB Nation's league feeds (the same publisher's public RSS as the fight sites): every
// story in a league's feed is about that league, so one that names none of our teams goes to the league itself
const US_FEEDS = [
  ['SB Nation NBA', 'sbnation.com', 'https://www.sbnation.com/rss/nba/index.xml', /^nba$/, 'nba'],
  ['SB Nation MLB', 'sbnation.com', 'https://www.sbnation.com/rss/mlb/index.xml', /^(mlb|npb)$/, 'mlb'],
];
async function fightNews(feeds = FIGHT_FEEDS, diagKey = 'fightNews') {
  const out = [], notes = [];
  for (const [name, host, feedUrl, keep = /^(ufc|boxing|nzboxing)$/, fallback] of feeds) {
    let xml;
    try {
      const r = await fetch(feedUrl, { headers: { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' }, signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw new Error(r.status);
      xml = await r.text();
    } catch (e) { notes.push(`${name}: error ${e.message}`); continue; }
    // RSS <item> or Atom <entry>
    const items = [...xml.matchAll(/<(item|entry)>([\s\S]*?)<\/\1>/g)];
    let n = 0;
    for (const m of items) {
      const get = tag => unxml((m[2].match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) || [])[1]);
      const title = get('title').trim();
      const url = (get('link') || (m[2].match(/<link[^>]*href="([^"]+)"/) || [])[1] || '').trim();
      const d = new Date(get('pubDate') || get('published') || get('updated'));
      const found = teamFor(title), team = keep.test(found || '') ? found : fallback;
      if (n >= 8 || !keep.test(team || '') || !url || isNaN(d) || now - d > 5 * DAY || out.some(x => x.url === url || x.title === title)) continue;
      out.push({
        id: host.split('.')[0] + '-' + url.split('/').filter(Boolean).pop().slice(0, 80), team,
        date: d.toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' }),
        kind: kindOf(title), title, summary: '', url, source: host, credit: `Headline from ${host}`, headlineOnly: true,
      });
      n++;
    }
    notes.push(`${name}: ${items.length} items, ${n} kept`);
  }
  diag[diagKey] = notes.join('; ');
  return out;
}

// BBC Sport's RSS feeds. The BBC's terms (bbc.co.uk/usingthebbc/terms-of-use, section 15) let a person add its RSS feeds to
// a website as long as the feed isn't changed and is credited "from BBC" with a link nearby, so each story keeps its
// headline and summary exactly as sent, links to the BBC, and is credited with a link to BBC Sport. Images are left out.
// Only stories that name one of our teams (or a fixture's teams) are kept
// every cricket headline, matched to our teams or not, for spotting rain on any match we list
const CRICKET_HEADLINES = [];
// every sport headline read this run (Herald, BBC, Scoop), for finding a Kiwi in an event we'd otherwise leave out
const HEADLINES = [];
const BBC_FEEDS = ['rugby-union', 'rugby-league', 'cricket', 'boxing', 'mixed-martial-arts', 'formula1', 'tennis', 'football/premier-league', 'basketball', 'baseball', 'golf']
  .map(s => [s, `https://feeds.bbci.co.uk/sport/${s}/rss.xml`]);
// in the basketball and baseball feeds a story is ours when it names one of that sport's teams, or the NBA or MLB (by name
// or by a team's short name); the WNBA, college and the rest stay out
const BBC_SPORT = {
  basketball: [/^(tallblacks|tallferns|breakers|nbl|nba)$/, t => /\bNBA\b/.test(t) || NBA_NICK.test(t) ? 'nba' : ''],
  baseball: [/^(mlb|npb)$/, t => /Japan|Nippon/.test(t) ? '' : /\bMLB\b/.test(t) || MLB_NICK.test(t) ? 'mlb' : ''],
  // every BBC golf story is golf: the women's game under the LPGA, the rest under the PGA Tour
  golf: [/^(pgatour|lpga|golfanz)$/, t => /\bLPGA\b|Solheim|women/i.test(t) ? 'lpga' : 'pgatour'],
};
async function bbcNews() {
  const out = [], notes = [];
  for (const [name, feedUrl] of BBC_FEEDS) {
    let xml;
    try {
      const r = await fetch(feedUrl, { headers: { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' }, signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw new Error(r.status);
      xml = await r.text();
    } catch (e) { notes.push(`${name}: error ${e.message}`); continue; }
    let n = 0, all = 0;
    for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      all++;
      const get = tag => unxml((m[1].match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) || [])[1]);
      const title = get('title'), summary = get('description'), url = get('link').replace(/\?at_medium=RSS.*$/, '');
      const d = new Date(get('pubDate'));
      if (url && !isNaN(d)) HEADLINES.push({ title: `${title} ${summary}`, at: d.toISOString() });
      if (name === 'cricket' && url && !isNaN(d)) CRICKET_HEADLINES.push({ title, url, at: d.toISOString(), credit: 'From BBC Sport', creditUrl: 'https://www.bbc.com/sport' });
      const found = teamFor(title + ' ' + summary), only = BBC_SPORT[name];
      const team = !only ? found : only[0].test(found || '') ? found : only[1](title + ' ' + summary);
      // the newest eight stories a feed has for us, so a busy one (the Premier League) doesn't crowd out the rest
      if (n >= 8 || !team || !url || isNaN(d) || now - d > 10 * DAY || out.some(x => x.url === url)) continue;
      out.push({
        id: 'bbc-' + url.split('/').filter(Boolean).slice(-1)[0].replace(/\W+/g, '-').slice(0, 80), team,
        date: d.toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' }), at: d.toISOString(),
        kind: kindOf(title + ' ' + summary), title, summary, url, source: 'BBC Sport', credit: 'From BBC Sport', creditUrl: 'https://www.bbc.com/sport', headlineOnly: true,
      });
      n++;
    }
    notes.push(`${name}: ${n} of ${all}`);
  }
  diag.bbc = notes.join('; ');
  return out;
}

// Cricket's state of play as it happens, from ESPN's score-strip feed (the one behind espncricinfo.com): "Match delayed
// by rain", "Lunch", "Stumps", "Innings break", and the score. Wikipedia's editors add these late if at all, so a rain
// delay never showed. ESPN's terms of use don't allow automated access without its permission, so the owner switched
// it off (19 Oct 2026); rain now comes from Sportmonks, BBC Sport and Herald headlines, and Wikipedia. Only switch this
// back on with ESPN's permission. It only adds to matches already on a card, never a card of its own
const ESPN_ON = false;
// "Central Stags" is ESPN's "Central Districts", "Auckland Aces" its "Auckland": compare on the place
const sideKey = n => norm(String(n || '').replace(/\b(aces|stags|hinds|volts|sparks|firebirds|blaze|kings|magicians|knights|brave|hearts|districts|wizards)\b/gi, ''));
const sameSide = (a, b) => { const x = sideKey(a), y = sideKey(b); return !!x && !!y && (x === y || x.startsWith(y) || y.startsWith(x)); };
// the card a live source's match belongs to: same sides (either way round), men's or women's, starting within 30 hours
const cricketCard = (events, t, a, b, w) => events.filter(e => e.sport === 'cricket' && e.status !== 'final' && isW(e) === w && Math.abs(Date.parse(e.startUTC) - t) < 30 * 36e5
  && ((sameSide(e.home, a) && sameSide(e.away, b)) || (sameSide(e.home, b) && sameSide(e.away, a)))).sort(near(t))[0];
async function espnCricket(events) {
  let d;
  try {
    const r = await fetch('https://site.web.api.espn.com/apis/v2/scoreboard/header?sport=cricket&lang=en&region=nz', { headers: { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(r.status);
    d = await r.json();
  } catch (e) { diag.espnCricket = 'error ' + e.message; return; }
  const list = (d.sports || []).flatMap(s => (s.leagues || []).flatMap(l => l.events || []));
  const done = [];
  for (const ev of list) {
    const st = ev.fullStatus || {}, type = st.type || {};
    const [c1, c2] = ev.competitors || [];
    if (!c1 || !c2 || type.state === 'post' || (type.state === 'pre' && !/delay|rain|wet|inspection|light/i.test(type.description || ''))) continue;
    const t = Date.parse(ev.date), w = /\bwomen\b/i.test(`${ev.name} ${c1.displayName} ${c2.displayName}`);
    const hit = cricketCard(events, t, c1.displayName, c2.displayName, w);
    if (!hit) continue;
    // "Day 2" on a Test; the page reads the day from the state of play ("Stumps, day 1" ends day 1)
    const day = /^Day \d$/.test(st.session || '') ? `, ${st.session.toLowerCase()}` : '';
    const desc = type.description === 'Live' ? 'In play' : type.description || '';
    if (!desc) continue;
    const score = c => c.score ? `${sameSide(hit.home, c.displayName) ? hit.home : hit.away} ${c.score}` : '';
    const homeFirst = sameSide(hit.home, c1.displayName) ? [c1, c2] : [c2, c1];
    Object.assign(hit, { progress: desc + day, liveState: type.state, liveAt: new Date(now).toISOString() });
    const ls = homeFirst.map(score).filter(Boolean).join(' v ');
    if (ls) hit.liveScore = ls; else delete hit.liveScore;
    if (!hit.cricinfo && ev.id) hit.cricinfo = `https://www.espncricinfo.com/ci/engine/match/${ev.id}.html`;
    done.push(`${hit.home} v ${hit.away}: ${hit.progress}${ls ? ' / ' + ls : ''}`);
  }
  diag.espnCricket = `${list.length} on ESPN now, ${done.length} on our cards${done.length ? ': ' + done.join('; ') : ''}`;
}

// Sportmonks Cricket (cricket.sportmonks.com): a licensed live-score API whose free plan covers T20 internationals, the
// Big Bash and CSA T20 (not Tests, ODIs or NZ domestic cricket). Its match states include "Delayed" and "Int." (play
// interrupted, usually by weather) besides lunch, tea, innings breaks and stumps. It needs the owner's free API token in
// the SPORTMONKS_TOKEN secret, and is only asked while a cricket match is on. A match ESPN already gave a state this run
// keeps ESPN's
async function sportmonksCricket(events) {
  const token = process.env.SPORTMONKS_TOKEN;
  if (!token) { diag.sportmonks = 'no token (add the SPORTMONKS_TOKEN secret to switch it on)'; return; }
  const on = events.some(e => e.sport === 'cricket' && e.status !== 'final' && now - Date.parse(e.startUTC) > -36e5 && now - Date.parse(e.startUTC) < 5.5 * DAY);
  if (!on) { diag.sportmonks = 'no cricket on'; return; }
  let d;
  try {
    const r = await fetch(`https://cricket.sportmonks.com/api/v2.0/livescores?api_token=${encodeURIComponent(token)}&include=localteam,visitorteam,runs`, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(r.status);
    d = await r.json();
  } catch (e) { diag.sportmonks = 'error ' + e.message; return; }
  const done = [];
  for (const m of d.data || []) {
    const st = String(m.status || ''), note = String(m.note || '');
    const rain = /rain|wet|weather|drizzle|light/i.test(note) ? ' by rain' : '';
    const desc = /^\d\w* Innings$/i.test(st) ? 'In play' : /^Stump Day (\d)$/i.test(st) ? `Stumps, day ${st.match(/\d/)[0]}` : st === 'Innings Break' ? 'Innings break'
      : st === 'Tea Break' ? 'Tea' : st === 'Lunch' ? 'Lunch' : st === 'Dinner' ? 'Dinner break' : st === 'Int.' ? 'Play interrupted' + rain : st === 'Delayed' ? 'Start delayed' + rain : '';
    const a = m.localteam?.name, b = m.visitorteam?.name;
    if (!desc || !a || !b) continue;
    const hit = cricketCard(events, Date.parse(m.starting_at), a, b, /\bwomen\b/i.test(`${a} ${b}`));
    if (!hit || (hit.liveAt === new Date(now).toISOString() && hit.liveState)) continue;
    // each side's latest innings: "162/5 (20 ov)"
    const score = (id, name) => {
      const r = (m.runs || []).filter(x => x.team_id === id).sort((x, y) => (y.inning || 0) - (x.inning || 0))[0];
      return r ? `${sameSide(hit.home, name) ? hit.home : hit.away} ${r.score}${r.wickets < 10 ? '/' + r.wickets : ''} (${r.overs} ov)` : '';
    };
    const sides = sameSide(hit.home, a) ? [[m.localteam_id, a], [m.visitorteam_id, b]] : [[m.visitorteam_id, b], [m.localteam_id, a]];
    const ls = sides.map(([id, n]) => score(id, n)).filter(Boolean).join(' v ');
    Object.assign(hit, { progress: desc, liveState: 'in', liveAt: new Date(now).toISOString() });
    if (ls) hit.liveScore = ls; else delete hit.liveScore;
    done.push(`${hit.home} v ${hit.away}: ${desc}${ls ? ' / ' + ls : ''}`);
  }
  diag.sportmonks = `${(d.data || []).length} live on Sportmonks, ${done.length} on our cards${done.length ? ': ' + done.join('; ') : ''}`;
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
  const events = [], news = [], kiwisIn = [];
  for (const f of (await readdir(dir)).filter(f => f.endsWith('.json'))) {
    const d = JSON.parse(await readFile(new URL(f, dir), 'utf8'));
    events.push(...(d.events || [])); news.push(...(d.news || [])); kiwisIn.push(...(d.kiwisIn || []));
  }
  return { events, news, kiwisIn };
}

// free live streams on the sports bodies' own YouTube channels: NZ Cricket streams domestic and Māori tournament games,
// Cricket Australia the Shield and One-Day Cup, and so on. Two requests a channel a run (two of the key's 10,000 daily
// units): its latest 50 uploads, which list scheduled and live streams too, then those videos' stream times. A stream
// counts for a game when its title names both sides and it starts on one of the game's days. Off without the
// YOUTUBE_API_KEY secret
const YT_CHANNELS = [
  ['cricket', 'NZ Cricket', 'UCuKowzPg2-A0FcmyPa3yWug'], ['cricket', 'Cricket Australia', 'UC2naOExy27J5Qz3SO-w6xkQ'],
  ['netball', 'Netball NZ', 'UCBL_yvdSAenDVDAyfCQNOpQ'], ['hockey', 'Hockey NZ', 'UC3xM-N7a2Ad_WZOCcONDPmg'],
  ['basketball', 'Basketball NZ', 'UC4OycSjzkovtoJPLC3YBo2w'], ['football', 'NZ Football', 'UCOlVcyI-9J8QiPkxjKhT5zg'],
  ['league', 'NZ Rugby League', 'UCEztFfJS3r2MjXiHEdPDo9Q'],
];
// the word a title names a side by: "Central Stags" -> central, "New South Wales" -> new south wales, "NSW" too
const ytSide = t => { const n = String(t || '').toLowerCase().replace(/\s+women('s)?$/, '').trim();
  const two = /^(new|south|western|northern|north|central|sydney|melbourne|brisbane|perth|adelaide|hobart|papua|cook)\b/.test(n);
  return n.split(/\s+/).slice(0, two ? (/^(new south|papua new)/.test(n) ? 3 : 2) : 1).join(' '); };
const YT_ALIAS = { 'new south wales': ['nsw'], 'northern districts': ['northern brave', 'nd '], 'central stags': ['central districts', 'cd '], 'central': ['central districts'] };
const WOMEN_TITLE = /women|wahine|wncl|wbbl|hearts|magicians|blaze|sparks|hinds|brave women|\bfire\b|meteors|scorpions|spirit|fury|breakers/i;
async function youtubeStreams(events) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) { diag.youtube = 'no key (add the YOUTUBE_API_KEY secret to switch it on)'; return; }
  const yt = async (path, q) => { const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${q}&key=${key}`); if (!r.ok) throw new Error(`${path} ${r.status}`); return r.json(); };
  const found = [], notes = [];
  for (const [sport, ch, id] of YT_CHANNELS) {
    try {
      const pl = await yt('playlistItems', `part=contentDetails&maxResults=50&playlistId=UU${id.slice(2)}`);
      const ids = (pl.items || []).map(x => x.contentDetails.videoId);
      if (!ids.length) continue;
      const v = await yt('videos', `part=snippet,liveStreamingDetails&id=${ids.join(',')}`);
      const streams = (v.items || []).filter(x => x.liveStreamingDetails).map(x => ({ id: x.id, title: x.snippet.title, state: x.snippet.liveBroadcastContent,
        at: x.liveStreamingDetails.actualStartTime || x.liveStreamingDetails.scheduledStartTime || '' })).filter(x => x.at);
      notes.push(`${ch} ${streams.length}`);
      for (const st of streams) {
        const title = ` ${st.title.toLowerCase()} `, at = Date.parse(st.at);
        for (const e of events) {
          if (e.sport !== sport || !e.home || !e.away || e.status === 'cancelled') continue;
          const start = Date.parse(e.startUTC), days = /shield|plunket|test|first[- ]class|four[- ]day/i.test(`${e.comp} ${e.format || ''}`) ? 5 : 1;
          if (at < start - 3 * 36e5 || at > start + (days - 1) * DAY + 12 * 36e5) continue;
          const names = t => { const k = ytSide(t); return [k, ...(YT_ALIAS[k] || []), ...(YT_ALIAS[String(t).toLowerCase()] || [])]; };
          if (![e.home, e.away].every(t => names(t).some(n => title.includes(n.endsWith(' ') ? ` ${n}` : n)))) continue;
          const women = /women/i.test(`${e.comp} ${e.home} ${e.away}`) || ['whiteferns', 'wbbl', 'blacksticksw', 'kiwiferns', 'silverferns', 'tallferns', 'anzprem'].includes(e.team);
          if (sport === 'cricket' && WOMEN_TITLE.test(st.title) !== women) continue;
          (e.yt ||= []).push({ url: `https://www.youtube.com/watch?v=${st.id}`, ch, at: st.at, state: st.state });
          found.push(`${e.home} v ${e.away} (${st.state})`);
        }
      }
    } catch (err) { notes.push(`${ch} error ${err.message}`); }
  }
  for (const e of events) if (e.yt) e.yt.sort((a, b) => a.at < b.at ? -1 : 1);
  diag.youtube = `streams per channel: ${notes.join(', ')}; matched ${found.length}${found.length ? ': ' + found.slice(0, 20).join('; ') : ''}`;
}

// the TV guide: what's actually listed for a game on NZ channels (TVNZ 1 and 2, Three, Sky Open, DUKE, Whakaata Māori
// and the Sky Sport channels), from the community-run NZ XMLTV guide at i.mjh.nz (the Sky Go guide, which carries all of
// them). The file is big (60MB+), so it's read at most every six hours and only its sport listings kept. A listing
// counts for a game when it names both sides (or the race or fight night) and starts within two hours before to an hour
// after the game; one starting later the same day or the next is the game shown delayed
const TV_FREE = /^(TVNZ 1|TVNZ 2|Three|Sky Open|TVNZ DUKE|Whakaata Māori|Rush|Bravo|eden)$/;
const TV_SKIP = /highlights|archive|replay|review|classic|documentar|magazine|lounge|preview show|the breakdown|rewind|best of|motw|goal rush|countdown|press conference|weigh-in/i;
const TV_NICK = { 'black caps': ['blackcaps', 'black caps', 'new zealand', 'nzl'], 'white ferns': ['white ferns', 'new zealand', 'nzl'], 'all blacks': ['all blacks', 'new zealand'],
  'black ferns': ['black ferns', 'new zealand'], kiwis: ['kiwis', 'new zealand', 'nzl'], 'kiwi ferns': ['kiwi ferns', 'new zealand'], 'silver ferns': ['silver ferns', 'new zealand'],
  'all whites': ['all whites', 'new zealand'], 'football ferns': ['football ferns', 'new zealand'], 'tall blacks': ['tall blacks', 'new zealand'], 'tall ferns': ['tall ferns', 'new zealand'],
  'black sticks': ['black sticks', 'new zealand'], wallabies: ['wallabies', 'australia', 'aus'], wallaroos: ['wallaroos', 'australia'], springboks: ['springboks', 'south africa'],
  proteas: ['proteas', 'south africa', 'rsa'], jillaroos: ['jillaroos', 'australia'], kangaroos: ['kangaroos', 'australia'],
  // a side named "New Zealand" in the feed goes by its nickname in the guide ("Blackcaps v India: 1st T20")
  'new zealand': ['new zealand', 'nzl', 'nz', 'blackcaps', 'black caps', 'white ferns', 'all blacks', 'black ferns', 'kiwis', 'kiwi ferns', 'silver ferns', 'all whites', 'football ferns', 'tall blacks', 'tall ferns', 'black sticks'] };
const TV_CODE = { india: 'ind', australia: 'aus', england: 'eng', 'south africa': 'rsa', pakistan: 'pak', 'sri lanka': 'sl', bangladesh: 'ban', 'west indies': 'wi', ireland: 'ire',
  zimbabwe: 'zim', afghanistan: 'afg', 'new zealand': 'nzl', scotland: 'sco', france: 'fra', fiji: 'fij', samoa: 'sam', tonga: 'ton' };
async function tvGuide(events) {
  const cacheUrl = new URL('.cache/tvguide.json', ROOT);
  let cache = {};
  try { cache = JSON.parse(await readFile(cacheUrl, 'utf8')); } catch {}
  if (!cache.t || cache.v !== 3 || Date.now() - cache.t > 6 * 36e5) {
    try {
      const items = [], seen = new Set(), lo = Date.now() - 2 * DAY, hi = Date.now() + 15 * DAY;
      // the Sky Go guide (every Sky channel and the free ones), then the free-to-air guide, which has some free-to-air
      // listings the Sky one lacks (Three's cricket); a listing in both is kept once
      for (const url of ['https://i.mjh.nz/SkyGo/epg.xml', 'https://i.mjh.nz/nz/epg.xml']) {
      const r = await fetch(url, { headers: { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' } });
      if (!r.ok) throw new Error(`${url} ${r.status}`);
      const xml = await r.text(), ent = x => x.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
      const ch = Object.fromEntries([...xml.matchAll(/<channel id="([^"]+)"[^>]*>\s*<display-name[^>]*>([^<]+)/g)].map(m => [m[1], ent(m[2]).trim().replace(/^DUKE$/, 'TVNZ DUKE')]));
      const when = v => Date.UTC(+v.slice(0, 4), +v.slice(4, 6) - 1, +v.slice(6, 8), +v.slice(8, 10), +v.slice(10, 12)) - (/([+-])(\d\d)(\d\d)/.test(v) ? (RegExp.$1 === '-' ? -1 : 1) * (+RegExp.$2 * 60 + +RegExp.$3) * 6e4 : 0);
      for (const m of xml.matchAll(/<programme start="([^"]+)" stop="[^"]*" channel="([^"]+)">([\s\S]*?)<\/programme>/g)) {
        const body = m[3], cats = [...body.matchAll(/<category[^>]*>([^<]+)/g)].map(x => x[1]).join(' ');
        const at = when(m[1]); if (at < lo || at > hi || !ch[m[2]]) continue;
        const title = ent((body.match(/<title[^>]*>([^<]*)/) || [])[1] || ''), sub = ent((body.match(/<sub-title[^>]*>([^<]*)/) || [])[1] || ''), desc = ent((body.match(/<desc[^>]*>([^<]*)/) || [])[1] || '');
        // a sport listing by its category, or by a "X v Y" title (free-to-air channels don't always give a category)
        if (!/sport|rugby|cricket|league|football|netball|hockey|basketball|motor|tennis|ufc|boxing/i.test(cats) && !/\S \s*(v|vs|V)\.? \S/.test(`${title} ${sub}`)) continue;
        if (TV_SKIP.test(`${title} ${sub}`)) continue;
        if (seen.has(`${ch[m[2]]}|${at}`)) continue;
        seen.add(`${ch[m[2]]}|${at}`);
        items.push({ ch: ch[m[2]], at, text: `${title} | ${sub} | ${desc.slice(0, 240)}`, live: /\blive\b/i.test(`${title} ${sub} ${desc}`) });
      }
      }
      cache = { t: Date.now(), v: 3, items }; // v: bumped when what's kept changes, so an old cache is read again
      try { await mkdir(new URL('.cache/', ROOT), { recursive: true }); await writeFile(cacheUrl, JSON.stringify(cache)); } catch {}
    } catch (err) { diag.tvGuide = 'error ' + err.message; if (!cache.items) return; }
  }
  const items = cache.items || [], hits = [];
  const sideNames = t => { const n = String(t || '').toLowerCase().replace(/\s+women('s)?$/, '').trim();
    return [...new Set([n, ...(TV_NICK[n] || []), ...(TV_CODE[n] ? [TV_CODE[n]] : []), ytSide(t)])].filter(x => x.length > 1); };
  // a name as a whole word, or as its adjective ("Australian Diamonds")
  const has = (text, w) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}n?([^a-z]|$)`, 'i').test(text);
  for (const e of events) {
    if (e.status === 'final' || !e.startUTC) continue;
    const start = Date.parse(e.startUTC), solo = !e.away || /^(motor|tennis|mma|boxing|sailing|golf)$/.test(e.sport);
    const women = /women/i.test(`${e.comp} ${e.home} ${e.away}`) || ['whiteferns', 'blackferns', 'kiwiferns', 'silverferns', 'tallferns', 'blacksticksw', 'wbbl', 'fpc', 'anzprem', 'lpga'].includes(e.team);
    const found = [];
    for (const it of items) {
      const d = it.at - start;
      if (d < -2.5 * 36e5 || d > 30 * 36e5) continue;
      const t = it.text;
      if (solo) {
        const key = e.sport === 'mma' ? 'ufc' : e.team === 'supercars' ? 'supercars' : e.team === 'sailgp' ? 'sailgp' : e.sport === 'golf' ? '(golf|pga|lpga)' : e.team === 'f1' ? '(formula 1|f1)' : String(compOf0(e)).toLowerCase();
        if (!new RegExp(key, 'i').test(t) || (e.team === 'f1' && !has(t, String(e.home).replace(/ grand prix$/i, '').toLowerCase()))) continue;
        // a golf listing names the tournament: one of its own words ("Bermuda", "Annika"), not "Open" or "Championship"
        if (e.sport === 'golf') { const ws = String(e.home).toLowerCase().split(/[^a-z]+/).filter(w => w.length > 3 && !/^(open|championship|classic|tour|golf|ladies|women|invitational|presented|tournament|champions|the)$/.test(w)); if (!(ws.length ? ws : [String(e.home).toLowerCase()]).some(w => has(t, w))) continue; }
      } else {
        if (![e.home, e.away].every(s => sideNames(s).some(n => has(t, n)))) continue;
        const wt = /women|\bw\b|ferns|wahine|wbbl|wncl|nrlw|jillaroos|wallaroos|wxv|aupiki/i.test(t);
        if (wt !== women) continue;
      }
      // more than an hour after the start: shown delayed (or the next day's coverage of a Test)
      found.push({ ch: it.ch, at: new Date(it.at).toISOString(), delayed: d > 60 * 6e4 });
    }
    if (!found.length) continue;
    // one entry a channel (its first listing: a pre-game show and the game are two), free channels first
    const byCh = new Map();
    for (const f of found.sort((a, b) => a.at < b.at ? -1 : 1)) if (!byCh.has(f.ch)) byCh.set(f.ch, f);
    // the live listings; a delayed one only when there's nothing live (repeats later in the week aren't worth listing)
    const all = [...byCh.values()].sort((a, b) => (TV_FREE.test(b.ch) - TV_FREE.test(a.ch)) || (a.delayed - b.delayed) || (a.at < b.at ? -1 : 1));
    e.tv = (all.some(x => !x.delayed) ? all.filter(x => !x.delayed) : all.slice(0, 1)).slice(0, 4);
    hits.push(`${e.home}${e.away ? ' v ' + e.away : ''}: ${e.tv.map(x => x.ch + (x.delayed ? ' (delayed)' : '')).join(', ')}`);
  }
  diag.tvGuide = `${items.length} sport listings (read ${new Date(cache.t).toISOString().slice(0, 16)}); ${hits.length} games listed: ${hits.slice(0, 30).join('; ')}`;
}
const compOf0 = e => String(e.comp || '').replace(/\s*[·,(].*$/, '').trim();

function applyBroadcast(e, rules) {
  const fits = r => (!r.team || r.team === e.team) && (!r.comp || new RegExp(r.comp, 'i').test(e.comp));
  // how to watch in Australia (many of the games are Australian): added whatever NZ coverage the game already has
  if (!e.watchAU) { const a = rules.find(r => r.au && fits(r)); if (a) e.watchAU = a.au; }
  if (e.broadcast && e.broadcast !== 'TBC') return;
  const r = rules.find(r => 'broadcast' in r && fits(r));
  // from a rule for the whole competition, not this game's own listing: the page says so
  if (r) { e.broadcast = r.broadcast; e.watchRule = true; if (r.watchAlt && !e.watchAlt) e.watchAlt = r.watchAlt; if (r.watchNote && !e.watchNote) e.watchNote = r.watchNote; }
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
await supercarsStartTimes(wiki, f1Cache, diag);
try { await mkdir(new URL('.cache/', ROOT), { recursive: true }); await writeFile(f1Url, JSON.stringify(f1Cache)); } catch {}
// the NBA from balldontlie (free key): the games around now with the Wikipedia ones, the standings with the tables;
// every result so far is remembered in .cache/nba.json
const nbaUrl = new URL('.cache/nba.json', ROOT);
let nbaCache = {};
try { nbaCache = JSON.parse(await readFile(nbaUrl, 'utf8')); } catch {}
try { const nba = await nbaGames(nbaCache, diag); wiki.push(...nba.events); tables.push(...nba.tables); await writeFile(nbaUrl, JSON.stringify(nbaCache)); } catch (e) { diag.nba = 'error: ' + e.message; }
// TheSportsDB often rate-limits shared GitHub runners, so keep each league's last good pull for up to 3 days
const tsdbCacheUrl = new URL('.cache/tsdb-events.json', ROOT);
let tsdbCache = {};
try { tsdbCache = JSON.parse(await readFile(tsdbCacheUrl, 'utf8')); } catch {}

// same fixture from two sources? UFC cards match on date alone
const WOMEN_KEYS = new Set(['blackferns', 'whiteferns', 'kiwiferns', 'fpc', 'wbbl', 'blacksticksw', 'tallferns', 'silverferns', 'anzprem']);
const isW = e => WOMEN_KEYS.has(e.team) || /women|wheelchair/i.test([e.comp, e.home, e.away].join(' '));
// a race weekend's sessions (qualifying, practice, Supercars' Saturday race) are never the race itself
const same = (a, b) => a.team === b.team && isW(a) === isW(b) && (a.session || '') === (b.session || '') && (a.team === 'ufc' ? Math.abs(new Date(a.startUTC) - new Date(b.startUTC)) < 1.5 * DAY : sameMatch(a, b));
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

// NRL clubs go by many names across sources ("Auckland", "New Zealand", "Warriors"; "Sydney" for the Roosters on
// Wikipedia's finals pages). One full club name each, so the same club matches, finds its logo and opens one team page.
const NRL_CLUBS = {
  'Brisbane Broncos': ['brisbane', 'broncos'], 'Canberra Raiders': ['canberra', 'raiders'],
  'Canterbury-Bankstown Bulldogs': ['canterbury', 'canterbury-bankstown', 'canterbury bankstown', 'bulldogs', 'canterbury bulldogs'],
  'Cronulla-Sutherland Sharks': ['cronulla', 'cronulla-sutherland', 'cronulla sutherland', 'sharks', 'cronulla sharks'],
  Dolphins: ['dolphins', 'the dolphins', 'redcliffe dolphins'], 'Gold Coast Titans': ['gold coast', 'titans'],
  'Manly Warringah Sea Eagles': ['manly', 'manly warringah', 'manly-warringah', 'sea eagles', 'manly-warringah sea eagles', 'manly sea eagles'],
  'Melbourne Storm': ['melbourne', 'storm'], 'Newcastle Knights': ['newcastle', 'knights'], 'North Queensland Cowboys': ['north queensland', 'cowboys'],
  'Parramatta Eels': ['parramatta', 'eels'], 'Penrith Panthers': ['penrith', 'panthers'],
  'South Sydney Rabbitohs': ['south sydney', 'souths', 'rabbitohs'], 'St George Illawarra Dragons': ['st george illawarra', 'st. george illawarra', 'dragons', 'st. george illawarra dragons'],
  'Sydney Roosters': ['sydney', 'roosters', 'eastern suburbs'], 'Wests Tigers': ['wests', 'tigers'],
  'New Zealand Warriors': ['warriors', 'new zealand', 'auckland', 'nz warriors', 'auckland warriors'], 'Perth Bears': ['perth', 'bears'],
};
const NRL_NAME = new Map(Object.entries(NRL_CLUBS).flatMap(([full, alts]) => [[full.toLowerCase(), full], ...alts.map(a => [a, full])]));
const nrlName = n => NRL_NAME.get(String(n || '').trim().toLowerCase().replace(/\s+/g, ' ')) || n;
const isNRL = e => e.sport === 'league' && !/NRLW|women/i.test(e.comp || '') && (/\bNRL\b/.test(e.comp || '') || (e.tags || []).includes('nrl') || e.team === 'nrl' || (e.team === 'warriors' && /NRL|finals/i.test(e.comp || '')));
for (const e of [...tsdbAll, ...wiki, ...curated.events]) if (isNRL(e)) { e.home = nrlName(e.home); e.away = nrlName(e.away); }
for (const t of tables) if (t.sport === 'league' && /^NRL\b/.test(t.comp || '') && !/women|NRLW/i.test(t.page || '')) for (const r of t.rows) r.name = nrlName(r.name);

// TheSportsDB has exact times; Wikipedia has scores for more competitions. Merge both, then onto curated.
const live = [];
for (const e of [...tsdbLive, ...wiki]) {
  const hit = live.find(x => same(x, e));
  if (!hit) { live.push(e); continue; }
  if (hit.timeTBC && !e.timeTBC) Object.assign(hit, { startUTC: e.startUTC, timeTBC: false });
  if (!hit.score && e.score) Object.assign(hit, { score: e.score, status: e.status, summary: e.summary });
  if (/^TBC$/.test(hit.away) && e.away !== 'TBC') Object.assign(hit, { home: e.home, away: e.away });
  for (const k of ['venue', 'city', 'tz', 'link', 'card', 'squads', 'cricinfo', 'about']) if (!hit[k] && e[k]) hit[k] = e[k];
  if (e.weather) hit.weather = e.weather;
  for (const k of ['progress', 'liveScore']) if (e[k]) hit[k] = e[k];
  if (e.card && /wikipedia/.test(e.source)) { hit.source = e.source; if (e.score) Object.assign(hit, { score: e.score, summary: e.summary, status: e.status }); }
}

const events = curated.events.map(e => ({ ...e }));
for (const le of live) {
  const hit = events.find(e => same(e, le));
  if (hit) {
    // live sources win on time, status and score; curated keeps names, notes and broadcast. A kick-off kept by hand
    // from the official draw stands against one a few minutes off, though (Wikipedia had Samoa v Wales at 7:50 for the
    // draw's 7:45): only a real move, 20 minutes or more, replaces it
    const moved = Math.abs(Date.parse(le.startUTC) - Date.parse(hit.startUTC)) >= 20 * 60e3;
    if (hit.timeTBC || (!le.timeTBC && moved)) Object.assign(hit, { startUTC: le.startUTC, timeTBC: le.timeTBC });
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
// Women's events with no Kiwi in them are left out for now (the owner's call, 23 Oct 2026): world title fights, and LPGA
// events other than the five majors, which Lydia Ko plays every year. The women's Rugby League World Cup, the tennis
// finals and the WBBL (White Ferns play in it) stay. Marked here and dropped once the headlines are in, unless a Kiwi
// turns out to be in one (see KIWI_IN below)
const LPGA_MAJOR = /Chevron Championship|U\.?S\.? Women.s Open|Women.s PGA Championship|Evian Championship|AIG Women.s Open|Women.s (British )?Open Championship/i;
for (const e of events) if (e.team === 'lpga' ? !LPGA_MAJOR.test(e.home) : e.team === 'boxing' && /women/i.test([e.comp, e.home, e.away].join(' '))) e.noKiwi = true;
// Wikipedia's Sheffield Shield table lists some games away side first (New South Wales v Western Australia at the
// WACA): a state or NZ domestic side playing at its own ground goes on the left. Only when the ground is plainly one
// side's and not the other's; the card's id stays as it was, so a revealed result stays revealed
{
  const HOME_GROUND = { 'Western Australia': /Perth/, 'New South Wales': /Sydney|Newcastle|Wollongong|Coffs Harbour|Bowral/, Victoria: /Melbourne|Geelong|Ballarat/,
    Queensland: /Brisbane|Mackay|Cairns|Townsville|Gold Coast/, 'South Australia': /Adelaide/, Tasmania: /Hobart|Launceston/,
    Auckland: /Auckland/, Canterbury: /Christchurch|Rangiora|Lincoln|Timaru|Ashburton/, Wellington: /Wellington|Hutt|Porirua/, Otago: /Dunedin|Queenstown|Alexandra|Invercargill|Oamaru/,
    'Northern Districts': /Hamilton|Mount Maunganui|Tauranga|Whangārei|Whangarei|Gisborne|Rotorua/, 'Central Districts': /Napier|Nelson|New Plymouth|Palmerston North|Whanganui|Hastings|Masterton/ };
  const base = n => String(n || '').replace(/\s+(Women('s)?|Aces|Stags|Hinds|Volts|Sparks|Firebirds|Blaze|Kings|Magicians|Knights|Brave|Hearts|Wizards)$/i, '').trim();
  const at = (n, e) => HOME_GROUND[base(n)]?.test(`${e.city || ''} ${e.venue || ''}`);
  const turned = [];
  for (const e of events) {
    if (e.sport !== 'cricket' || !HOME_GROUND[base(e.home)] || !HOME_GROUND[base(e.away)] || at(e.home, e) || !at(e.away, e)) continue;
    [e.home, e.away] = [e.away, e.home];
    for (const k of ['Logo', 'Credit', 'LogoCredit', 'Badge']) [e['home' + k], e['away' + k]] = [e['away' + k], e['home' + k]];
    for (const k of ['home', 'away', 'homeLogo', 'awayLogo', 'homeCredit', 'awayCredit', 'homeLogoCredit', 'awayLogoCredit', 'homeBadge', 'awayBadge']) if (e[k] === undefined) delete e[k];
    const sides = (e.score || '').split(' v ');
    if (sides.length === 2) e.score = `${sides[1]} v ${sides[0]}`;
    turned.push(`${e.home} v ${e.away} (${e.city || e.venue})`);
  }
  diag.homeSides = turned.length ? `home side put first: ${turned.join('; ')}` : 'none turned';
}
if (ESPN_ON) await espnCricket(events);
await sportmonksCricket(events);
// a hand correction in the curated files ("fix") wins over every live source, for when a source has a score wrong
for (const e of events) if (e.fix) Object.assign(e, e.fix);
events.forEach(e => applyBroadcast(e, rules));
await youtubeStreams(events);
await tvGuide(events);
for (const e of events) if (!e.tz && e.city) { const bits = e.city.split(',').map(x => x.trim()); e.tz = tzFor(bits[0], bits[bits.length - 1]); }

const COUNTRY = /^(New Zealand|Australia|England|Scotland|Wales|Ireland|France|Italy|South Africa|Argentina|Japan|Fiji|Samoa|Tonga|Papua New Guinea|Cook Islands|India|Sri Lanka|Bangladesh|Pakistan|West Indies|Lebanon|Canada|USA|United States|Chile|Uruguay|Georgia|Portugal|Spain|Romania|Netherlands|Belgium|Germany|Great Britain|Malaysia|South Korea|China|Austria|Egypt|Namibia)( Women| A| XI| Wheelchair)?$/i;
const newsAll = [...curated.news];
{
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pairs = new Map();
  for (const e of events) {
    const age = now - Date.parse(e.startUTC);
    if (age > 2 * DAY || age < -14 * DAY || e.noKiwi) continue;
    const card = (e.card || []).slice(0, 4).flatMap(b => [b.a, b.b]).map(n => String(n || '').replace(/\s*\(c\)$/, ''));
    for (const n of [e.home, e.away, ...card]) {
      if (!n || n.length < 6 || /TBC|winner|^UFC|Fight Night|\bor\b/i.test(n) || COUNTRY.test(n)) continue;
      pairs.set(n, [e.team, e.sport]);
      const last = n.split(' ').pop();
      if (/^(mma|boxing)$/.test(e.sport) && last.length >= 6) pairs.set(last, [e.team, e.sport]);
    }
  }
  // a side named after a place ("Victoria", "Canterbury", "Auckland") only counts when the story is also about its sport,
  // so "Victoria University" or "Auckland Council" stays out
  const place = n => !!CITY_TZ[n] || /^(Victoria|Queensland|Tasmania|New South Wales|South Australia|Western Australia|Northland|North Harbour|Counties Manukau|Waikato|Bay of Plenty|Taranaki|Hawke's Bay|Manawat[uū]|Wellington|Tasman|Canterbury|Otago|Southland|Northern Districts|Central Districts|Auckland)$/.test(n);
  const SPORT_WORDS = { cricket: /\b(cricket|Shield|wickets?|innings|Dean Jones|one-day)\b/i, rugby: /\b(rugby|NPC|Ranfurly|Farah Palmer)\b/i, league: /\bleague\b/i, football: /\b(football|soccer)\b/i,
    hockey: /\bhockey\b/i, basketball: /\b(basketball|NBL)\b/i, netball: /\bnetball\b/i };
  EVENT_NAMES = [...pairs].map(([n, [t, sp]]) => {
    const re = new RegExp(`\\b${esc(n)}\\b`), sw = place(n) && (SPORT_WORDS[sp] || /$^/);
    return [{ test: text => re.test(text) && (!sw || sw.test(text)) }, t];
  });
}
// RNZ's RSS terms (rnz.co.nz/rss) say "No audio or text from these may be posted to a web site ... without the express
// permission of Radio New Zealand", so the feed stays off; the page links to RNZ Sport instead. Only switch this back on
// with RNZ's written permission
const RNZ_ON = false;
for (const n of [...(RNZ_ON ? await rnzNews() : []), ...await heraldNews(), ...await scoopNews(), ...await fightNews(), ...await fightNews(US_FEEDS, 'usNews'), ...await bbcNews()]) if (!newsAll.some(x => x.url === n.url || x.title === n.title)) newsAll.push(n);
const news = newsAll.filter(n => now - new Date(n.date) < 30 * DAY);
// A left-out event comes back when a Kiwi is in it: named in data/curated's kiwisIn ({ event, year, who }), or in a
// headline from two days before it starts to a day after it ends that also names the event, its place or its tour
// (and isn't about pulling out). It then shows like any other, with a note saying who's in it
{
  const KIWI_IN = { golf: KIWI_GOLF, boxing: /\b(Mea Motu|Lani Daniels|Alrie Meleisea|Sequoia Graham)\b/i };
  const words = e => [...String(e.home).split(/[^A-Za-z]+/).filter(w => w.length > 3 && !/^(open|championship|classic|tour|golf|ladies|women|invitational|presented|tournament|champions|the|title|titles|world)$/i.test(w)),
    ...String(e.city || '').split(/[^A-Za-z]+/).filter(w => w.length > 3), e.team === 'lpga' ? 'LPGA' : ''].filter(Boolean);
  const back = [], left = [];
  for (const e of events.filter(e => e.noKiwi)) {
    const year = e.startUTC.slice(0, 4), name = String(e.away ? `${e.home} v ${e.away}` : e.home);
    const hand = curated.kiwisIn.find(k => String(k.year || year) === year && norm(name).includes(norm(k.event)));
    let who = hand?.who;
    if (!who && KIWI_IN[e.sport]) {
      const from = Date.parse(e.openUTC || e.startUTC) - 2 * DAY, to = Date.parse(e.startUTC) + DAY, ws = words(e);
      const h = HEADLINES.find(h => { const t = Date.parse(h.at); return t >= from && t <= to && KIWI_IN[e.sport].test(h.title) && !/withdr|pull(s|ed)? out|skip/i.test(h.title)
        && ws.some(w => new RegExp(`\\b${w}\\b`, 'i').test(h.title)); });
      if (h) who = h.title.match(KIWI_IN[e.sport])[1];
    }
    if (who) { delete e.noKiwi; e.note = [e.note, `${who} is ${e.sport === 'golf' ? 'playing' : 'fighting'}`].filter(Boolean).join('. '); back.push(`${name} (${who})`); }
    else left.push(name);
  }
  for (let i = events.length; i--;) if (events[i].noKiwi) events.splice(i, 1);
  diag.womenNoKiwi = `${left.length} left out (${HEADLINES.length} headlines read); back with a Kiwi: ${back.join('; ') || 'none'}; left out: ${left.slice(0, 10).join('; ')}`;
}
// Rain on a cricket match from the headlines, for when no live feed has it: a BBC Sport or Herald headline published
// during the match that names both sides and rain, a delay or bad light. BBC's scorecard pages ("Start delayed on second
// day of South Africa-Australia Test - scorecard") are set up before play and retitled as it goes, so their publish
// time is older than the match; their title is always current, so any from two days before the start on count. The
// live card shows the headline as it was sent, linked and credited, never reworded
{
  const WET = /\b(rain\w*|showers?|wet outfield|washed out|wash-?out|delay(ed|s)?|bad light|abandon\w*|no play|covers)\b/i;
  const flat = t => norm(String(t || '').replace(/proteas/gi, 'south africa').replace(/windies/gi, 'west indies'));
  const wet = [...CRICKET_HEADLINES, ...newsAll.filter(n => /^nzherald\.co\.nz$/.test(n.source))].filter(n => n.at && now - Date.parse(n.at) < 7 * DAY && WET.test(n.title));
  const hits = [];
  for (const e of events) {
    const start = Date.parse(e.startUTC);
    if (e.sport !== 'cricket' || e.status === 'final' || start > now || now - start > 5.5 * DAY) continue;
    const sides = [e.home, e.away].map(x => norm(String(x || '').replace(/\s+Women('s)?$/i, '')));
    const w = isW(e);
    const n = wet.filter(n => Date.parse(n.at) > start - (/scorecard/i.test(n.title) ? 2 * DAY : 2 * 36e5) && w === /\bwomen\b|white ferns/i.test(n.title) && sides.every(x => x && flat(n.title).includes(x)))
      .sort((a, b) => b.at.localeCompare(a.at))[0];
    if (!n) continue;
    e.wxNews = { title: n.title, url: n.url, credit: n.credit, ...(n.creditUrl ? { creditUrl: n.creditUrl } : {}), at: n.at };
    hits.push(`${e.home} v ${e.away}: ${n.title}`);
  }
  diag.rainHeadlines = `${wet.length} rain headlines this week; ${hits.length ? hits.join('; ') : 'none on our matches'}`;
}

// Club logos from TheSportsDB's free API (badges used as-is, credited in the footer).
// Countries use flags in the page instead. Looked-up names are cached between runs.
// TheSportsDB labels union and league both "Rugby", so logos are matched within the right competitions only.
// Each code: the leagues whose team lists we pull, and which strLeague values a name search may accept.
const LOGO_CODES = {
  rugby: { leagues: ['Super Rugby', 'Super Rugby Pacific', 'Mitre 10 Cup', 'Bunnings NPC', 'NPC'], ok: /Super Rugby|Mitre 10|NPC|Provincial|Rugby Championship|Premiership Rugby|Top 14|United Rugby/i },
  league: { leagues: ['NRL', 'Australian National Rugby League'], ok: /NRL|Rugby League|Super League/i },
  football: { leagues: ['Australian A-League', 'Australian A-League Men'], ok: /A-League|Soccer|Football/i, sport: 'Soccer' },
  cricket: { leagues: ['Big Bash League', 'Womens Big Bash League', 'Super Smash', 'Plunket Shield', 'Ford Trophy', 'Sheffield Shield'], ok: /Big Bash|Super Smash|Plunket|Ford Trophy|Sheffield|Cricket/i, sport: 'Cricket' },
  basketball: { leagues: ['Australian NBL', 'NBA'], ok: /NBL|NBA|Basketball/i, sport: 'Basketball' },
  netball: { leagues: ['New Zealand Netball League'], ok: /Netball/i, sport: 'Netball' },
  baseball: { leagues: ['MLB', 'Nippon Baseball League'], ok: /MLB|Nippon|Baseball/i, sport: 'Baseball' },
};
// NZ domestic cricket sides go by their association name in fixtures but their team name on TheSportsDB
const LOGO_ALIAS = { 'cricket|Northern Districts': ['Northern Brave', 'Northern Knights'], 'cricket|Canterbury': ['Canterbury Kings', 'Canterbury Wizards'], 'cricket|Central Districts': ['Central Stags'],
  'cricket|Auckland': ['Auckland Aces'], 'cricket|Wellington': ['Wellington Firebirds'], 'cricket|Otago': ['Otago Volts'],
  'basketball|S.E. Melbourne Phoenix': ['South East Melbourne Phoenix'], 'basketball|SE Melbourne Phoenix': ['South East Melbourne Phoenix'],
  'rugby|Drua': ['Fijian Drua'], 'rugby|Force': ['Western Force'] };
const LOGO_V = 4; // bump to re-ask names whose earlier miss is still cached
// crests under a free licence on Wikimedia Commons, for sides TheSportsDB has no badge for; credited on the crest and in the footer
const COMMONS_LOGOS = {
  'cricket|Queensland': { src: 'https://upload.wikimedia.org/wikipedia/commons/b/bd/Queensland_Cricket_logo.png', credit: 'Queensland Cricket logo by OzJourno99, CC BY-SA 4.0, via Wikimedia Commons', page: 'https://commons.wikimedia.org/wiki/File:Queensland_Cricket_logo.png' },
};
const logoCredits = new Map();
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
    const p = [name, ...(LOGO_ALIAS[key] || [])].map(n => fromPool(sport, n)).find(Boolean);
    if (p) { found[key] = p; continue; }
    const c = cache.names[key];
    // misses are asked again every 3 days, as TheSportsDB keeps adding badges
    if (c && (c.b || (now - c.t < 3 * DAY && (c.v || 0) >= LOGO_V))) { found[key] = c.b; continue; }
    if (looked >= 10) continue;
    looked++;
    let b = null, failed = false;
    for (const q of [...new Set([name, ...(LOGO_ALIAS[key] || []), name.replace(/\s+(FC|Bulls|Stags|Mako|Steamers|Pride|Storm|Women)$/i, '')])]) {
      try {
        // (asked even after the run's time for TheSportsDB is up: a found badge is kept for good, so this soon stops)
        const d = await tsdb(`searchteams.php?t=${encodeURIComponent(q)}`, { extra: true });
        const code = LOGO_CODES[sport];
        const t = (d.teams || []).find(t => (code.sport ? t.strSport === code.sport : t.strSport === 'Rugby') && code.ok.test(t.strLeague || '') && simple(t.strTeam).startsWith(simple(q).slice(0, 5)));
        b = t && (t.strBadge || t.strTeamBadge) || null;
      } catch { failed = true; }
      if (b) break;
    }
    if (failed) continue;
    cache.names[key] = { t: now, b, v: LOGO_V };
    found[key] = b;
  }
  // Farah Palmer Cup sides TheSportsDB doesn't list wear their union's crest, already found for its NPC side:
  // Wellington Pride gets Wellington's, Northland Kauri gets Northland's
  const place = n => simple(String(n || '').replace(/\s+(Pride|Kauri|Storm|Tui|Spirit|Whio|Volcanix|Heat|Cyclones|Mako|Bulls|Stags|Steamers|Lions|Taniwha|Women)$/i, ''));
  for (const e of events) if (e.team === 'fpc') for (const n of [e.home, e.away]) {
    const k = `rugby|${n}`;
    if (!n || found[k] || !want.has(k)) continue;
    const u = Object.keys(found).find(x => x.startsWith('rugby|') && found[x] && place(x.slice(6)) === place(n));
    if (u) found[k] = found[u];
  }
  diag.cricketLogos = [...want.keys()].filter(k => k.startsWith('cricket|')).map(k => `${k.slice(8)}${found[k] ? '*' : ''}`).join(', ');
  for (const e of events) {
    const h = found[`${e.sport}|${e.home}`], a = found[`${e.sport}|${e.away}`];
    if (h && !e.homeLogo) e.homeLogo = h + '/tiny';
    if (a && !e.awayLogo) e.awayLogo = a + '/tiny';
    for (const side of ['home', 'away']) {
      const c = !e[side + 'Logo'] && COMMONS_LOGOS[`${e.sport}|${e[side]}`];
      if (c) { e[side + 'Logo'] = c.src; e[side + 'LogoCredit'] = c.credit; logoCredits.set(c.credit, c.page); }
    }
  }
  // National men's sides keep their flag; their union's badge (when TheSportsDB has one) shows beside it.
  // From fixtures already pulled, else one name search each (a few a run, remembered for a month).
  const NAT = { rugby: [c => `${c} Rugby`, t => t.strSport === 'Rugby' && !/League/i.test(t.strLeague || '')], league: [c => `${c} Rugby League`, t => t.strSport === 'Rugby' && /League/i.test(`${t.strLeague} ${t.strTeam}`)],
    cricket: [c => c, t => t.strSport === 'Cricket'], football: [c => c, t => t.strSport === 'Soccer'] };
  cache.nat ||= {};
  let natLooked = 0;
  const natWant = new Map();
  // a side billed by its nickname ("All Blacks", "Kiwis") gets the same badge as when it's billed by country
  const NAT_NICK = { rugby: { 'All Blacks': 'New Zealand', Wallabies: 'Australia', Springboks: 'South Africa', 'Los Pumas': 'Argentina', Pumas: 'Argentina' },
    league: { Kiwis: 'New Zealand', Kangaroos: 'Australia' }, cricket: { 'Black Caps': 'New Zealand', BlackCaps: 'New Zealand', Proteas: 'South Africa' } };
  const country = (sport, n) => NAT_NICK[sport]?.[n] || n;
  for (const e of events) if (NAT[e.sport] && !isW(e)) for (const n0 of [e.home, e.away]) { const n = country(e.sport, n0); if (n && COUNTRY.test(n) && !/ (A|XI|Wheelchair|Women)$/i.test(n)) natWant.set(`${e.sport}|${n}`, [e.sport, n]); }
  for (const [key, [sport, name]] of natWant) {
    const fromFix = seen[`${sport}|${simple(name)}`];
    if (fromFix) { cache.nat[key] = { t: now, b: fromFix }; continue; }
    const c = cache.nat[key];
    if (c && now - c.t < (c.b ? 30 : 3) * DAY) continue;
    if (natLooked >= 4) continue;
    natLooked++;
    try {
      const d = await tsdb(`searchteams.php?t=${encodeURIComponent(NAT[sport][0](name))}`, { extra: true });
      const t = (d.teams || []).find(t => NAT[sport][1](t) && simple(t.strTeam).startsWith(simple(name)) && !/women|u2\d|u1\d|sevens|7s|\bA\b|XI/i.test(t.strTeam));
      cache.nat[key] = { t: now, b: t ? (t.strBadge || t.strTeamBadge || null) : null };
    } catch { /* rate limited: next run */ }
  }
  for (const e of events) for (const side of ['home', 'away']) {
    const b = !isW(e) && cache.nat[`${e.sport}|${country(e.sport, e[side])}`]?.b;
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
    // a rematch is billed "Van vs. Pantoja 2"
    const n = String(e[side] || '').replace(/\s+\d+$/, ''), last = s => strip(s).split(/\s+/).pop().toLowerCase();
    // the surname can come first ("Wang Cong" is billed as "Wang"), so any word of the full name may match
    const m = (e.card || []).flatMap(b => [b.a, b.b]).find(x => x && strip(x).includes(' ') && (last(x) === last(n) || strip(x).toLowerCase().split(/\s+/).includes(last(n))));
    return /\s/.test(n || '') || !m ? strip(n) : strip(m);
  };
  // a full name only: a lone surname (a far-off card with no bouts listed yet) would find the wrong page
  const ok = n => n && /\S\s+\S/.test(n) && !/TBC|TBA|^UFC|Fight Night|\bvs?\b|\d/i.test(n) && n.split(' ').length <= 4;
  const kindOf = {};
  // every card's main event first (a new card's headliners are looked up on the next run), then the undercards
  for (const e of near) for (const n of [full(e, 'home'), full(e, 'away')]) if (ok(n)) kindOf[n] ||= e.sport === 'boxing' ? 'boxer' : 'fighter';
  // cards run top-down from the main event, so the co-main of every card comes next, then each card's third fight, and so on
  const soon = near.filter(e => Math.abs(Date.parse(e.startUTC) - now) < 30 * DAY);
  for (let i = 0; i < Math.max(0, ...soon.map(e => (e.card || []).length)); i++)
    for (const e of soon) { const b = (e.card || [])[i]; if (b) for (const n of [strip(b.a), strip(b.b)]) if (ok(n)) kindOf[n] ||= e.sport === 'boxing' ? 'boxer' : 'fighter'; }
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
    // 4. Commons search: photos that name the fighter but sit in no category of theirs (common for undercard
    // fighters with no article). The file's own text must give the full name and say UFC, MMA or boxing
    const fold = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').toLowerCase();
    // also fighters looked up on an earlier run who still have no photo, a fortnight apart
    let searched = 0, searchHits = 0;
    const extra = names.filter(n => !due.includes(n) && cache[n]?.v === 5 && !cache[n].src && (!cache[n].cs || now - cache[n].cs > 14 * DAY));
    const toSearch = [...due.filter(n => !cands[n]?.length), ...extra].slice(0, 25);
    for (const n of toSearch) {
      searched++;
      if (cache[n]) cache[n].cs = now;
      const r = await get('commons.wikimedia.org', `action=query&generator=search&gsrnamespace=6&gsrlimit=15&${INFO}&gsrsearch=` + encodeURIComponent(`"${n}"`));
      let hit = false;
      for (const pg of r.query?.pages || []) {
        const md = pg.imageinfo?.[0]?.extmetadata || {}, about = plain(`${md.ImageDescription?.value || ''} ${md.Categories?.value || ''} ${md.ObjectName?.value || ''} ${pg.title}`);
        if (!fold(about).includes(fold(n)) || !(FIGHTER.test(about) || /\bUFC\b|Bellator|\bPFL\b|\bONE Championship/.test(about))) continue;
        add(n, pg, 0); hit = true;
      }
      if (hit) searchHits++;
    }
    diag.facesSearch = `${searched} searched on Commons, ${searchHits} with a matching photo`;
    const score = ({ title, ii, bonus }) => {
      if (!/jpeg|png|webp/.test(ii.mime || '') || Math.min(ii.width, ii.height) < 200 || /\blogo\b|poster|belt\b|signature/i.test(title)) return -99;
      const r = ii.height / ii.width, md = ii.extmetadata || {};
      const year = +((`${title} ${plain(md.DateTimeOriginal?.value)}`.match(/\b(20[12]\d)\b/) || [])[1] || 0);
      return bonus + (r >= 1.15 ? 3 : r >= 0.85 ? 2 : r >= 0.6 ? 0 : -3)
        + (/crop|headshot|portrait|\bface\b|\bhead\b/i.test(title) ? 3 : 0)
        - (/\bvs?\.?\s|\bfight\b|\bbout\b|face.?off|press conference|\bwith\b|\band\b|&/i.test(title) ? 3 : 0)
        + (year >= 2015 ? Math.min(3, (year - 2015) * 0.3) : 0);
    };
    for (const n of [...due, ...toSearch.filter(n => !due.includes(n))]) {
      const best = (cands[n] || []).map(c => ({ c, s: score(c) })).filter(x => x.s > -50).sort((a, b) => b.s - a.s)[0];
      if (!best) continue;
      const { title, ii } = best.c, md = ii.extmetadata || {};
      found[n] = { src: ii.thumburl, file: title, ...(best.c.bonus ? {} : { from: 'commons' }),
        credit: [plain(md.Artist?.value), plain(md.LicenseShortName?.value)].filter(Boolean).join(', ') + ' / Wikimedia Commons' };
      delete miss[n];
    }
    diag.facesCommons = `${cs.tried} categories tried, ${cs.files} had files`;
  } catch (e) { diag.facesError = e.message; }
  // only names that got an answer are cached; any left over by an error are tried again next run
  for (const n of due) if (found[n] || miss[n]) cache[n] = found[n] ? { t: now, v: 5, ...found[n] } : { t: now, v: 5, src: null, why: miss[n], cs: now };
  for (const n of Object.keys(found)) if (!due.includes(n)) cache[n] = { t: now, v: 5, ...found[n] };
  // 5. Openverse (openverse.org, the free search of Creative Commons images): Flickr photos for fighters Wikimedia has
  // none of. Licences that allow adapting only (the page crops to a circle), mature results off, a dozen names a run,
  // each re-asked weekly. The photo's title or tags must give the full name and a fight word, and not name an opponent
  const ovFold = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').toLowerCase().trim();
  const ovDue = names.filter(n => !cache[n]?.src && cache[n]?.v === 5 && (!cache[n].ov || now - cache[n].ov > 7 * DAY)).slice(0, 12);
  const ov = { asked: 0, found: 0, note: '' };
  for (const n of ovDue) {
    let res;
    try {
      await new Promise(r => setTimeout(r, 1500));
      const r = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(n)}&source=flickr&license_type=modification&mature=false&page_size=20`, UA);
      if (r.status === 429) { ov.note = 'rate-limited, stopped'; break; }
      if (!r.ok) throw new Error(r.status);
      res = (await r.json()).results || [];
    } catch (e) { ov.note = 'error ' + e.message; break; }
    ov.asked++; ov.results = (ov.results || 0) + res.length;
    cache[n].ov = now;
    const want = ovFold(n), squash = want.replace(/ /g, '');
    ov.named = (ov.named || 0) + res.filter(x => ovFold(x.title).includes(want) || (x.tags || []).some(t => ovFold(t.name).replace(/ /g, '') === squash)).length;
    const best = res.map(x => {
      const title = ovFold(x.title), tags = (x.tags || []).map(t => ovFold(t.name)), text = `${title} ${tags.join(' ')}`;
      const url = String(x.url || '');
      if (!(title.includes(want) || tags.some(t => t === want || t.replace(/ /g, '') === squash))) return null;
      if (!/\b(ufc|mma|fight\w*|box\w*|weigh|octagon|bellator|pfl|cage|kickbox\w*|martial|bjj|jiu)\b/.test(text)) return null;
      if (/\b(vs?|versus|and|with)\b|&/.test(title.replace(want, '')) || !/staticflickr\.com\/.+\/\d+_[0-9a-f]+(_[bcmnqstwz])?\.jpg$/i.test(url)) return null;
      const r = (x.height || 1) / (x.width || 1);
      const s = (r >= 1.15 ? 3 : r >= 0.85 ? 2 : r >= 0.6 ? 0 : -3) + (/weigh|media day|portrait|headshot|press|open workout|face/.test(text) ? 2 : 0) - (/\bfight\b|\bbout\b|\bround\b/.test(title) ? 2 : 0);
      // Flickr sizes: "_n" is 320px; the large "_k"/"_h"/"_o" files have their own secret, so those are skipped
      return { x, s, src: url.replace(/(_[bcmnqstwz])?\.jpg$/i, '_n.jpg') };
    }).filter(Boolean).sort((a, b) => b.s - a.s)[0];
    if (!best) continue;
    const { x } = best, lic = x.license === 'cc0' ? 'CC0' : x.license === 'pdm' ? 'Public domain' : `CC ${String(x.license).toUpperCase()} ${x.license_version || ''}`.trim();
    Object.assign(cache[n], { src: best.src, file: x.foreign_landing_url, from: 'openverse', credit: `${x.creator || 'unknown'}, ${lic} / Flickr via Openverse`, t: now });
    ov.found++;
  }
  // 6. TheSportsDB (the free API the site already reads fixtures from): its player photo for the top three fights of each card (UFC and boxing) that
  // Wikimedia and Openverse have none of. Only a "Fighting" player whose name matches in full; each re-asked weekly
  // the main event, the co-main and the fight before it on each card,
  const mainNames = [...new Set([...near.flatMap(e => [full(e, 'home'), full(e, 'away')]), ...near.flatMap(e => (e.card || []).slice(0, 3).flatMap(b => [strip(b.a), strip(b.b)])),
    // then anyone lower down with their own Wikipedia article (a known name, like a veteran near the end of his career)
    ...names.filter(n => cache[n]?.why === 'no free photo')].filter(ok))];
  const sdb = { asked: 0, found: 0 };
  for (const n of mainNames.filter(n => !cache[n]?.src && (!cache[n]?.sdb || now - cache[n].sdb > 7 * DAY)).slice(0, 16)) {
    try {
      // the free key allows about 30 calls a minute, shared with the fixtures read earlier in the run: a pause, and on a
      // "too many requests" a longer one and a second try
      const ask = () => fetch('https://www.thesportsdb.com/api/v1/json/123/searchplayers.php?p=' + encodeURIComponent(n), UA);
      await new Promise(r => setTimeout(r, 2500));
      let r = await ask();
      if (r.status === 429) { await new Promise(r => setTimeout(r, 30000)); r = await ask(); }
      if (!r.ok) throw new Error(r.status);
      const want = ovFold(n), list = (await r.json()).player || [];
      sdb.asked++;
      (cache[n] ||= { t: now, v: 5, src: null, why: 'not looked up' }).sdb = now;
      const p = list.find(x => /fight|box/i.test(x.strSport || '') && (ovFold(x.strPlayer) === want || ovFold(x.strPlayer).split(' ').sort().join(' ') === want.split(' ').sort().join(' ')) && (x.strCutout || x.strThumb || x.strRender));
      if (!p) continue;
      Object.assign(cache[n], { src: (p.strCutout || p.strThumb || p.strRender) + '/small', file: `https://www.thesportsdb.com/player/${p.idPlayer}`, from: 'thesportsdb', credit: 'TheSportsDB', t: now });
      sdb.found++;
    } catch (e) { sdb.note = 'error ' + e.message; break; }
  }
  diag.facesSportsDB = `${sdb.asked} asked, ${sdb.found} found${sdb.note ? '; ' + sdb.note : ''}`;
  diag.facesOpenverse = `${ov.asked} asked (${ov.results || 0} photos back, ${ov.named || 0} naming the fighter), ${ov.found} found${ov.note ? '; ' + ov.note : ''}; ${names.filter(n => !cache[n]?.src && cache[n]?.v === 5 && !cache[n].ov).length} not asked yet`;
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
  diag.faces = `${have.length}/${names.length} fighters with a free photo (${have.filter(n => cache[n].from === 'commons').length} from Commons search or categories, ${have.filter(n => cache[n].from === 'openverse').length} from Openverse); ${due.length} looked up`;
  // every main event's two fighters, with whether each has a photo and why not
  diag.facesMain = `TheSportsDB: ${diag.facesSportsDB} ; ` + near.map(e => `${e.startUTC.slice(0, 10)} ${e.comp}: ` + ['home', 'away'].map(k => { const n = full(e, k), c = cache[n]; return `${e[k]}=>${n} ${c?.src ? 'OK' : c ? c.why || 'none' : 'not looked up'}`; }).join(' / ')).join(' ; ');
  diag.facesMissing = names.filter(n => !cache[n]?.src).map(n => `${n}: ${cache[n]?.v === 5 ? cache[n].why : 'not looked up yet'}`);
  try { await mkdir(new URL('.cache/', ROOT), { recursive: true }); await writeFile(cacheUrl, JSON.stringify(cache)); } catch {}
}

// Fighters' own pages for the fight cards: their Wikipedia article when it's about them (its short description says
// fighter or boxer), and their UFC.com, Sherdog, BoxRec and Tapology pages from Wikidata, which also covers undercard
// fighters with no article. Links only; nothing is copied from those sites. Each name is looked up monthly, 60 a run
async function addFighterLinks(events) {
  const cacheUrl = new URL('.cache/fighterlinks.json', ROOT);
  let cache = {};
  try { cache = JSON.parse(await readFile(cacheUrl, 'utf8')); } catch {}
  const UA = { headers: { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' } };
  const get = async (host, q) => { await new Promise(r => setTimeout(r, 1000)); const r = await fetch(`https://${host}/w/api.php?format=json&formatversion=2&maxlag=5&` + q, UA); if (!r.ok) throw new Error(`${host} ${r.status}`); return r.json(); };
  const strip = n => String(n || '').replace(/\s*\((c|ic)\)$/i, '').replace(/\s+['"‘“][^'"’”]+['"’”]\s+/, ' ').trim();
  const ok = n => n && /\S\s+\S/.test(n) && !/TBC|TBA|^UFC|Fight Night|\bvs?\b|\d/i.test(n) && n.split(' ').length <= 4;
  const fold = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
  const FIGHTER = /box|fight|martial|mma|kickbox|wrestl|judo|jiu|muay|sambo|karate|taekwondo/i;
  // mixed martial artist, boxer, martial artist, kickboxer, wrestler, judoka, Brazilian jiu-jitsu practitioner, Muay Thai fighter, sambo fighter
  const FIGHT_OCC = new Set(['Q11607585', 'Q11338576', 'Q13382533', 'Q1371925', 'Q13474373', 'Q6665249', 'Q18534714', 'Q14949394', 'Q19798842']);
  const PROPS = { ufc: 'P9722', sd: 'P2818', br: 'P1967', tp: 'P9728' };
  const near = events.filter(e => /^(mma|boxing)$/.test(e.sport) && Math.abs(Date.parse(e.startUTC) - now) < 60 * DAY);
  const kind = {};
  for (const e of near) for (const n of [e.home, e.away, ...(e.card || []).flatMap(b => [b.a, b.b])].map(strip)) if (ok(n)) kind[n] ||= e.sport === 'boxing' ? 'boxer' : 'fighter';
  const due = Object.keys(kind).filter(n => !cache[n] || now - cache[n].t > 30 * DAY).slice(0, 60);
  try {
    // 1. the English article, also tried as "Name (fighter)" / "(boxer)" when the plain title is someone else
    const wp = {}, qid = {};
    const look = async (titles, asked) => {
      for (let i = 0; i < titles.length; i += 20) {
        const r = await get('en.wikipedia.org', 'action=query&prop=description|pageprops&ppprop=wikibase_item|disambiguation&redirects=1&titles=' + encodeURIComponent(titles.slice(i, i + 20).join('|')));
        const back = {};
        for (const m of [...(r.query?.normalized || []), ...(r.query?.redirects || [])]) back[m.to] = back[m.from] || m.from;
        for (const pg of r.query?.pages || []) {
          const t = back[pg.title] || pg.title, name = asked[t] || t;
          if (wp[name] || pg.missing || pg.pageprops?.disambiguation || !FIGHTER.test(pg.description || '')) continue;
          wp[name] = pg.title;
          if (pg.pageprops?.wikibase_item) qid[name] = pg.pageprops.wikibase_item;
        }
      }
    };
    await look(due, {});
    const alt = {};
    for (const n of due.filter(n => !wp[n])) alt[`${n} (${kind[n]})`] = n;
    await look(Object.keys(alt), alt);
    // 2. no article: Wikidata's own search, keeping a person of exactly that name who fights (or has a fight-site id)
    const cand = {};
    for (const n of due.filter(n => !qid[n]).slice(0, 25)) {
      const r = await get('www.wikidata.org', 'action=wbsearchentities&language=en&type=item&limit=5&search=' + encodeURIComponent(n));
      cand[n] = (r.search || []).filter(x => fold(x.label) === fold(n)).map(x => x.id);
    }
    const ids = [...new Set([...Object.values(qid), ...Object.values(cand).flat()])];
    const claims = {};
    for (let i = 0; i < ids.length; i += 40) {
      const r = await get('www.wikidata.org', 'action=wbgetentities&props=claims&ids=' + ids.slice(i, i + 40).join('|'));
      for (const [q, ent] of Object.entries(r.entities || {})) claims[q] = ent.claims || {};
    }
    const val = (c, p) => c?.[p]?.[0]?.mainsnak?.datavalue?.value;
    const isFighter = c => (c?.P31 || []).some(x => x.mainsnak?.datavalue?.value?.id === 'Q5')
      && (Object.values(PROPS).some(p => val(c, p)) || (c?.P106 || []).some(x => FIGHT_OCC.has(x.mainsnak?.datavalue?.value?.id)));
    for (const n of due) {
      const q = qid[n] || (cand[n] || []).find(id => isFighter(claims[id]));
      const rec = { t: now, ...(wp[n] ? { wp: wp[n] } : {}) };
      for (const [k, p] of Object.entries(PROPS)) { const v = q && val(claims[q], p); if (typeof v === 'string') rec[k] = v; }
      cache[n] = rec;
    }
  } catch (e) { diag.fighterLinksError = e.message; }
  let linked = 0, places = 0;
  for (const e of near) for (const b of e.card || []) for (const k of ['a', 'b']) {
    places++;
    const { t, ...links } = cache[strip(b[k])] || {};
    if (Object.keys(links).length) { b[k + 'Links'] = links; linked++; }
  }
  diag.fighterLinks = `${linked}/${places} card places linked; ${due.length} looked up`;
  try { await mkdir(new URL('.cache/', ROOT), { recursive: true }); await writeFile(cacheUrl, JSON.stringify(cache)); } catch {}
}

// Each side's Wikipedia article and official website, for its team page. National sides go by Wikipedia's titles ("New
// Zealand national rugby league team"); clubs are found with Wikipedia's search, keeping a result whose short description
// is about that sport and whose title names the club's place. The website is the article's Wikidata "official website".
// Kept two months, 30 searches a run
// Crests TheSportsDB doesn't have: the side's Wikipedia article's logo on Wikidata (P154), used only when the file is on
// Wikimedia Commons under a free licence (public domain or Creative Commons), credited on the crest and in the footer.
// Looked up for sides with games within a month; found ones kept a month, misses asked again weekly.
async function wikiLogos(events, links) {
  const cacheUrl = new URL('.cache/wikilogos.json', ROOT);
  let cache = {};
  try { cache = JSON.parse(await readFile(cacheUrl, 'utf8')); } catch {}
  const UA = { headers: { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' } };
  const get = async (host, q) => { await new Promise(r => setTimeout(r, 1000)); const r = await fetch(`https://${host}/w/api.php?format=json&formatversion=2&maxlag=5&` + q, UA); if (!r.ok) throw new Error(`${host} ${r.status}`); return r.json(); };
  const need = new Map();
  for (const e of events) if (Math.abs(Date.parse(e.startUTC) - now) < 30 * DAY) for (const side of ['home', 'away']) {
    const k = `${e.sport}|${e[side]}`, wp = links[k]?.wp;
    if (!e[side + 'Logo'] && !e[side + 'Badge'] && wp) need.set(k, wp);
  }
  const due = [...need].filter(([k]) => !cache[k] || now - cache[k].t > (cache[k].src ? 30 : 7) * DAY).slice(0, 40);
  try {
    for (let i = 0; i < due.length; i += 40) {
      const batch = due.slice(i, i + 40);
      const r = await get('www.wikidata.org', 'action=wbgetentities&props=claims|sitelinks&sitefilter=enwiki&sites=enwiki&titles=' + encodeURIComponent(batch.map(([, wp]) => wp).join('|')));
      const fileOf = {};
      for (const ent of Object.values(r.entities || {})) { const t = ent.sitelinks?.enwiki?.title, f = ent.claims?.P154?.[0]?.mainsnak?.datavalue?.value; if (t && f) fileOf[t] = f; }
      const files = [...new Set(Object.values(fileOf))], info = {};
      if (files.length) {
        const ii = await get('commons.wikimedia.org', 'action=query&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=160&titles=' + encodeURIComponent(files.map(f => 'File:' + f).join('|')));
        const back = Object.fromEntries((ii.query?.normalized || []).map(x => [x.to, x.from]));
        for (const pg of ii.query?.pages || []) {
          const i0 = pg.imageinfo?.[0], m = i0?.extmetadata || {}, lic = m.LicenseShortName?.value || '';
          if (pg.missing || !i0 || m.NonFree?.value || !/public domain|^pd|cc0|cc[ -]by/i.test(lic)) continue;
          info[(back[pg.title] || pg.title).replace(/^File:/, '')] = { src: i0.thumburl || i0.url, page: i0.descriptionurl, lic };
        }
      }
      for (const [k, wp] of batch) { const f = fileOf[wp], c = f && (info[f] || info[f.replace(/_/g, ' ')]); cache[k] = c ? { t: now, src: c.src, credit: `${f.replace(/\.[a-z]+$/i, '')} (${c.lic}), via Wikimedia Commons`, page: c.page } : { t: now }; }
    }
  } catch (e) { diag.wikiLogosError = e.message; }
  let used = 0;
  for (const e of events) for (const side of ['home', 'away']) {
    const c = cache[`${e.sport}|${e[side]}`];
    if (c?.src && !e[side + 'Logo'] && !e[side + 'Badge']) { e[side + 'Logo'] = c.src; e[side + 'LogoCredit'] = c.credit; logoCredits.set(c.credit, c.page); used++; }
  }
  diag.wikiLogos = `${Object.values(cache).filter(c => c.src).length} free crests known, ${used} sides given one; ${due.length} looked up`;
  try { await mkdir(new URL('.cache/', ROOT), { recursive: true }); await writeFile(cacheUrl, JSON.stringify(cache)); } catch {}
}
async function teamLinks(events) {
  const cacheUrl = new URL('.cache/teamlinks.json', ROOT);
  let cache = {};
  try { cache = JSON.parse(await readFile(cacheUrl, 'utf8')); } catch {}
  const UA = { headers: { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' } };
  const get = async (host, q) => { await new Promise(r => setTimeout(r, 1000)); const r = await fetch(`https://${host}/w/api.php?format=json&formatversion=2&maxlag=5&` + q, UA); if (!r.ok) throw new Error(`${host} ${r.status}`); return r.json(); };
  const WORD = { rugby: 'rugby union', league: 'rugby league', cricket: 'cricket', football: 'football', hockey: 'field hockey', basketball: 'basketball', netball: 'netball', baseball: 'baseball' };
  const DESC = { rugby: /rugby union|rugby team|rugby football union|provincial union/i, league: /rugby league/i, cricket: /cricket/i, football: /football|soccer/i, hockey: /hockey/i, basketball: /basketball/i, netball: /netball/i, baseball: /baseball/i };
  const NICK = { 'All Blacks': 'New Zealand', 'Black Ferns': 'New Zealand', Wallabies: 'Australia', Wallaroos: 'Australia', Springboks: 'South Africa', 'Los Pumas': 'Argentina',
    Kiwis: 'New Zealand', 'Kiwi Ferns': 'New Zealand', Kangaroos: 'Australia', Jillaroos: 'Australia', 'Black Caps': 'New Zealand', 'White Ferns': 'New Zealand', 'Black Sticks': 'New Zealand', 'Tall Blacks': 'New Zealand', 'Tall Ferns': 'New Zealand', 'Silver Ferns': 'New Zealand' };
  const want = new Map();
  for (const e of events) {
    const age = now - Date.parse(e.startUTC);
    if (!WORD[e.sport] || age > 21 * DAY || age < -60 * DAY) continue;
    for (const n of [e.home, e.away]) if (n && !/TBC|winner|loser|\bor\b|placed|runner|semi-final|qualifier|\d(st|nd|rd|th)\b| (A|XI)$/i.test(n)) want.set(`${e.sport}|${n}`, [e.sport, n, isW(e) || /\bwomen\b|ferns|wallaroos|jillaroos/i.test(n)]);
  }
  const due = [...want.keys()].filter(k => !cache[k] || now - cache[k].t > 60 * DAY);
  const found = {};
  try {
    // national sides: one batch of exact titles
    const nat = {};
    for (const k of due) {
      const [sport, name, w] = want.get(k);
      const base = name.replace(/\s+Women('s)?$/i, '');
      const country = COUNTRY.test(base) && !/ (A|XI|Wheelchair)$/i.test(base) ? base : NICK[base];
      if (country) nat[`${country} ${sport === 'netball' ? '' : w ? "women's " : /^(hockey|basketball)$/.test(sport) ? "men's " : ''}national ${WORD[sport]} team`] = k;
    }
    const titles = Object.keys(nat);
    for (let i = 0; i < titles.length; i += 40) {
      const r = await get('en.wikipedia.org', 'action=query&prop=pageprops&ppprop=wikibase_item|disambiguation&redirects=1&titles=' + encodeURIComponent(titles.slice(i, i + 40).join('|')));
      const back = {};
      for (const m of [...(r.query?.normalized || []), ...(r.query?.redirects || [])]) back[m.to] = back[m.from] || m.from;
      for (const pg of r.query?.pages || []) { const k = nat[back[pg.title] || pg.title]; if (k && !pg.missing && !pg.pageprops?.disambiguation) found[k] = { wp: pg.title, q: pg.pageprops?.wikibase_item }; }
    }
    // clubs: a search each
    let searched = 0;
    for (const k of due) {
      if (found[k] || Object.values(nat).includes(k) || searched >= 30) continue;
      const [sport, name, w] = want.get(k);
      searched++;
      const r = await get('en.wikipedia.org', `action=query&generator=search&gsrlimit=5&prop=description|pageprops&ppprop=wikibase_item|disambiguation&gsrsearch=${encodeURIComponent(`${name} ${WORD[sport]}${w && !/women/i.test(name) ? ' women' : ''}`)}`);
      const place = name.split(/\s+/)[0].toLowerCase();
      const pg = (r.query?.pages || []).sort((a, b) => (a.index || 0) - (b.index || 0))
        .find(pg => !pg.pageprops?.disambiguation && DESC[sport].test(pg.description || '') && pg.title.toLowerCase().includes(place));
      found[k] = pg ? { wp: pg.title, q: pg.pageprops?.wikibase_item } : {};
    }
    const qs = [...new Set(Object.values(found).map(f => f.q).filter(Boolean))];
    const site = {};
    for (let i = 0; i < qs.length; i += 40) {
      const r = await get('www.wikidata.org', 'action=wbgetentities&props=claims&ids=' + qs.slice(i, i + 40).join('|'));
      for (const [q, ent] of Object.entries(r.entities || {})) { const v = ent.claims?.P856?.[0]?.mainsnak?.datavalue?.value; if (typeof v === 'string' && /^https?:\/\//.test(v)) site[q] = v; }
    }
    for (const [k, f] of Object.entries(found)) cache[k] = { t: now, ...(f.wp ? { wp: f.wp } : {}), ...(f.q && site[f.q] ? { site: site[f.q] } : {}) };
  } catch (e) { diag.teamLinksError = e.message; }
  const out = {};
  for (const k of want.keys()) { const { t, ...l } = cache[k] || {}; if (Object.keys(l).length) out[k] = l; }
  diag.teamLinks = `${Object.keys(out).length}/${want.size} sides linked; ${Object.keys(found).length} looked up`;
  try { await mkdir(new URL('.cache/', ROOT), { recursive: true }); await writeFile(cacheUrl, JSON.stringify(cache)); } catch {}
  return out;
}

// Calendar subscriptions: data/cal/<team>.ics for each team or competition on the page's team list, and nz.ics for every
// game a New Zealand side plays. Calendar apps re-read them on their own (Apple about hourly, Google up to a day), so
// moved times and new fixtures follow. Only what's known before a game goes in (time, where to watch, venue), never a
// score or result, so a calendar can't spoil one. Each game has a reminder 30 minutes before (Apple and Outlook use it;
// Google uses the calendar's own notification setting). Team names and the NZ-side rules are read from the page itself
// The site's own team list (keys and labels) and its NZ test, read from index.html, so the calendars and phone alerts
// follow the page's lists
async function siteTeams() {
  const page = await readFile(new URL('index.html', ROOT), 'utf8');
  const block = (page.match(/const TEAMS = \[([\s\S]*?)\n\];/) || [])[1] || '';
  const LABEL = Object.fromEntries([...block.matchAll(/\['(\w+)','((?:[^'\\]|\\.)*)'\]/g)].map(m => [m[1], m[2].replace(/\\'/g, "'")]));
  let NZ_KEYS = new Set(), NZ_NAMES = /\bNew Zealand\b/;
  try { NZ_KEYS = new Set(JSON.parse(page.match(/const NZ_KEYS = new Set\((\[[^\]]*\])\)/)[1].replace(/'/g, '"'))); } catch {}
  try { const m = page.match(/const NZ_NAMES = \/(.*)\/([a-z]*);/); NZ_NAMES = new RegExp(m[1], m[2]); } catch {}
  const CLUBS = { blues: 'Blues', chiefs: 'Chiefs', hurricanes: 'Hurricanes', crusaders: 'Crusaders', highlanders: 'Highlanders', warriors: 'Warriors' };
  return {
    LABEL,
    isNZ: e => NZ_KEYS.has(e.team) || !!e.nzEvent || [e.home, e.away].some(n => NZ_NAMES.test(n || '')),
    // the team and competition keys a game is listed under (a club's games include its NZ derbies in other comps)
    keysOf: e => Object.keys(LABEL).filter(k => e.team === k || (e.tags || []).includes(k) || (CLUBS[k] && [e.home, e.away].some(n => (n || '').includes(CLUBS[k])))),
  };
}
const GAME_ICON = { rugby: '🏉', league: '🏉', cricket: '🏏', football: '⚽', hockey: '🏑', basketball: '🏀', netball: '🏐', motor: '🏎️', tennis: '🎾', mma: '🥊', boxing: '🥊', sailing: '⛵', golf: '⛳', baseball: '⚾' };
const NZ_NICK = { 'rugby m': 'All Blacks', 'rugby w': 'Black Ferns', 'league m': 'Kiwis', 'league w': 'Kiwi Ferns', 'cricket m': 'Black Caps', 'cricket w': 'White Ferns', 'football m': 'All Whites', 'football w': 'Football Ferns', 'hockey m': 'Black Sticks', 'hockey w': 'Black Sticks Women', 'basketball m': 'Tall Blacks', 'basketball w': 'Tall Ferns', 'netball w': 'Silver Ferns' };
// "Black Caps v India"; a race or tournament is just its name; a fight card leads with the event
const gameTitle = e => {
  const name = n => { const w = /\s+Women('s)?$/i.test(n || '') || isW(e); return /^New Zealand( Women('s)?)?$/i.test(n || '') && NZ_NICK[`${e.sport} ${w ? 'w' : 'm'}`] || n; };
  return e.sport === 'motor' || e.sport === 'tennis' ? e.home : /^(mma|boxing)$/.test(e.sport) ? `${e.comp ? e.comp + ': ' : ''}${e.home} v ${e.away}` : `${name(e.home)} v ${name(e.away)}`;
};

async function writeCalendars(events) {
  const { LABEL, isNZ, keysOf } = await siteTeams();
  const ICON = GAME_ICON;
  const HOURS = { rugby: 2, league: 2, football: 2, hockey: 2, basketball: 2.5, netball: 1.5, motor: 2, tennis: 4, mma: 5, boxing: 4, sailing: 2.5, golf: 5 };
  const site = process.env.SITE_URL || 'https://kickoff.kiwi/';
  const esc = t => String(t || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  // lines longer than 75 bytes continue on the next line after a space, without splitting a character
  const fold = line => {
    const out = []; let cur = '', bytes = 0;
    for (const ch of line) { const b = Buffer.byteLength(ch); if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0; } cur += ch; bytes += b; }
    return [...out, cur].join('\r\n ');
  };
  const stamp = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const nzDate = d => d.toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' }).replace(/-/g, '');
  const vevents = e => {
    const start = new Date(e.startUTC);
    if (isNaN(start) || e.status === 'final' && now - start > 2 * DAY) return [];
    const what = gameTitle(e) + (e.session ? ` ${e.session.toLowerCase()}` : '');
    const desc = [[e.comp, e.stage].filter(Boolean).join(' · '), e.broadcast && e.broadcast !== 'TBC' ? `Watch: ${e.broadcast}` : '', [e.venue, e.city].filter(Boolean).join(', '), `Kickoff Kiwi: ${site}`].filter(Boolean).join('\n');
    const where = [e.venue, e.city].filter(Boolean).join(', ');
    // a Test or first-class match is one entry a day of play; a one-day game runs eight hours, a T20 three and a half
    const ctx = `${e.format || ''} ${e.stage || ''} ${e.comp || ''}`;
    const days = e.sport !== 'cricket' ? 1 : /Plunket|first.class/i.test(ctx) ? 4 : /\bTests?\b/.test(ctx) ? (isW(e) ? 4 : 5) : 1;
    const hrs = e.sport !== 'cricket' ? HOURS[e.sport] || 2 : days > 1 ? 7.5 : /\bT20|Super Smash|Big Bash|\bBBL|WBBL/i.test(ctx) ? 3.5 : 8;
    const out = [];
    for (let d = 0; d < days; d++) {
      const s = new Date(start.getTime() + d * DAY), lines = ['BEGIN:VEVENT', `UID:${e.id}${days > 1 ? '-d' + (d + 1) : ''}@kickoff-kiwi`, `DTSTAMP:${stamp(new Date(now))}`];
      if (e.timeTBC) lines.push(`DTSTART;VALUE=DATE:${nzDate(s)}`, `DTEND;VALUE=DATE:${nzDate(new Date(s.getTime() + DAY))}`);
      else lines.push(`DTSTART:${stamp(s)}`, `DTEND:${stamp(new Date(s.getTime() + hrs * 36e5))}`);
      lines.push(`SUMMARY:${esc(`${ICON[e.sport] || ''} ${what}${days > 1 ? ` (day ${d + 1})` : ''}${e.timeTBC ? ' (time TBC)' : ''}`.trim())}`, `DESCRIPTION:${esc(desc)}`);
      if (where) lines.push(`LOCATION:${esc(where)}`);
      if (/postponed|cancel/i.test(`${e.status} ${e.summary || ''}`)) lines.push('STATUS:CANCELLED');
      if (!e.timeTBC) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(what)}`, 'TRIGGER:-PT30M', 'END:VALARM');
      lines.push('END:VEVENT');
      out.push(...lines);
    }
    return out;
  };
  const cal = (title, list) => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kickoff Kiwi//Fixtures//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${esc(title)}`,
    'X-WR-TIMEZONE:Pacific/Auckland', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H', ...list.flatMap(vevents), 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n';
  const dir = new URL('data/cal/', ROOT);
  await mkdir(dir, { recursive: true });
  // practice and the other sessions that only show on a competition's page stay out of the calendars too
  const sorted = events.filter(e => !e.minor).sort((a, b) => a.startUTC.localeCompare(b.startUTC));
  const counts = [];
  for (const [k, label] of Object.entries(LABEL)) {
    const list = sorted.filter(e => keysOf(e).includes(k));
    await writeFile(new URL(`${k}.ics`, dir), cal(`${label} · Kickoff Kiwi`, list));
    counts.push(`${k} ${list.length}`);
  }
  const nz = sorted.filter(isNZ);
  await writeFile(new URL('nz.ics', dir), cal('NZ teams · Kickoff Kiwi', nz));
  diag.calendars = `nz ${nz.length}; ${counts.join(', ')}`;
}

// Phone alerts through ntfy (ntfy.sh: a free app, no account): "starts in 30 min" before each game with a set start time,
// a rain delay on a live cricket game, and "full time" once a result is in, never with the score. Topics: kickoffkiwi-nz
// for every NZ team's games, and kickoffkiwi-<key> for each team or competition in the site's list. Anyone who knows a
// topic can read it, which is fine for fixtures. What was sent is kept in .cache/alerts.json; if that's lost, a topic's
// own last 12 hours (ntfy keeps them) are checked before anything is sent to it again.
const NTFY_ON = true, NTFY = 'https://ntfy.sh/', TOPIC = k => `kickoffkiwi-${k}`;
const DONE_WORD = { cricket: 'Match over', tennis: 'Finished', motor: 'Race over', mma: 'Card over', boxing: 'Fight night over' };
async function phoneAlerts(events) {
  if (!NTFY_ON) return;
  const { isNZ, keysOf } = await siteTeams();
  const cacheUrl = new URL('.cache/alerts.json', ROOT);
  let sent = {};
  try { sent = JSON.parse(await readFile(cacheUrl, 'utf8')); } catch {}
  for (const k of Object.keys(sent)) if (!k.startsWith('__') && now - sent[k] > 3 * DAY) delete sent[k];
  const site = process.env.SITE_URL || 'https://kickoff.kiwi/';
  const nzDay = new Date(now).toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' });
  const due = [];
  for (const e of events) {
    const start = Date.parse(e.startUTC), mins = (start - now) / 6e4;
    if (isNaN(start)) continue;
    const what = `${GAME_ICON[e.sport] || ''} ${gameTitle(e)}`.trim();
    // where to watch: the TV guide's live listings with the time coverage starts ("On Three from 7:00pm"), a free
    // YouTube stream, else the usual broadcaster
    const nzTime = t => new Date(t).toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland', hour: 'numeric', minute: '2-digit' }).replace(/\s/g, '').toLowerCase();
    const tvLive = (e.tv || []).filter(x => !x.delayed);
    const watch = tvLive.length ? 'On ' + tvLive.map(x => `${x.ch} from ${nzTime(x.at)}`).join(', ')
      : e.yt?.length ? `Free on YouTube (${e.yt[0].ch})` : e.broadcast && e.broadcast !== 'TBC' ? e.broadcast : '';
    const where = [watch, [e.venue, e.city].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
    // runs are 5 to 10 minutes apart, so the first one inside 40 minutes sends it
    if (!e.timeTBC && e.status !== 'final' && mins > 0 && mins <= 40)
      due.push({ e, kind: 'start', title: `${what} starts in ${Math.max(5, Math.round(mins / 5) * 5)} min`, message: where || 'Starting soon', priority: 4 });
    // the same signs as the card's rain stamp: the state of play, or a fresh rain headline about the game; once a day
    const wetPlay = /\b(rain|wet|bad light|delayed|no play)\b/i.test(e.progress || '');
    const wetNews = e.wxNews && (!e.wxNews.at || now - Date.parse(e.wxNews.at) < 6 * 36e5);
    if (e.sport === 'cricket' && e.status !== 'final' && start < now && now - start < 6 * DAY && (wetPlay || wetNews))
      due.push({ e, kind: `rain-${nzDay}`, title: `🌧 Rain delay: ${gameTitle(e)}`, message: wetPlay ? e.progress : `${e.wxNews.title} (${e.wxNews.credit || 'news'})`, priority: 3 });
    // a Test or first-class game ends days after it starts
    const long = e.sport === 'cricket' && /\bTests?\b|first.class|Plunket/i.test(`${e.format || ''} ${e.stage || ''} ${e.comp || ''}`);
    if (e.status === 'final' && start < now && now - start < (long ? 6 * DAY : 12 * 36e5) && !/postponed|cancel/i.test(`${e.score || ''} ${e.summary || ''}`))
      due.push({ e, kind: 'end', title: `${DONE_WORD[e.sport] || 'Full time'}: ${gameTitle(e)}`, message: 'Tap to see the result (no score here)', priority: 3 });
  }
  // the very first run only notes the results already in, rather than announcing them all at once
  if (!sent.__seeded) {
    for (const d of due) if (d.kind === 'end') for (const topic of [...(isNZ(d.e) ? ['nz'] : []), ...keysOf(d.e)]) sent[`end|${d.e.id}|${topic}`] = now;
    sent.__seeded = now;
  }
  const polled = {}, log = [];
  const already = async topic => {
    if (!polled[topic]) {
      polled[topic] = new Set();
      try {
        const r = await fetch(`${NTFY}${TOPIC(topic)}/json?poll=1&since=12h`, { headers: { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi/)' } });
        for (const line of (await r.text()).split('\n')) { try { const m = JSON.parse(line); if (m.click) polled[topic].add(m.click); } catch {} }
      } catch {}
    }
    return polled[topic];
  };
  let posts = 0, failed = 0;
  for (const d of due) {
    const click = `${site}#g=${encodeURIComponent(d.e.id)}&a=${d.kind}`;
    for (const topic of [...new Set([...(isNZ(d.e) ? ['nz'] : []), ...keysOf(d.e)])]) {
      const key = `${d.kind}|${d.e.id}|${topic}`;
      if (sent[key]) continue;
      if ((await already(topic)).has(click)) { sent[key] = now; continue; }
      if (posts >= 40) break;
      try {
        await new Promise(r => setTimeout(r, 400));
        const r = await fetch(NTFY, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ topic: TOPIC(topic), title: d.title, message: d.message, click, priority: d.priority }) });
        if (!r.ok) throw new Error(r.status);
        sent[key] = now; posts++; log.push(`${topic}: ${d.title}`);
      } catch (err) { failed++; log.push(`${topic}: failed (${err.message}) ${d.title}`); }
    }
  }
  try { await writeFile(cacheUrl, JSON.stringify(sent)); } catch {}
  diag.alerts = `${due.length} due, ${posts} sent${failed ? `, ${failed} failed` : ''}${log.length ? ': ' + log.slice(0, 12).join('; ') : ''}`;
}

// Squad names link to each player's Cricinfo profile: the Cricinfo id comes from Wikidata (ESPNcricinfo player ID, P2697),
// found through the player's Wikipedia article. Ids are kept for 30 days, players without one are re-asked weekly
async function addPlayerLinks(events, more = []) {
  const cacheUrl = new URL('.cache/players.json', ROOT);
  let cache = {};
  try { cache = JSON.parse(await readFile(cacheUrl, 'utf8')); } catch {}
  const UA = { headers: { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' } };
  const get = async (host, q) => { await new Promise(r => setTimeout(r, 1000)); const r = await fetch(`https://${host}/w/api.php?format=json&formatversion=2&maxlag=5&` + q, UA); if (!r.ok) throw new Error(`${host} ${r.status}`); return r.json(); };
  const players = [...events.filter(e => e.squads && Math.abs(Date.parse(e.startUTC) - now) < 30 * DAY).flatMap(e => e.squads.flatMap(s => s.players)), ...more.flatMap(s => s.players)];
  const key = p => p.w || p.n;
  const due = [...new Set(players.map(key))].filter(k => !cache[k] || now - cache[k].t > (cache[k].ci ? 30 : 7) * DAY).slice(0, 150);
  try {
    const qid = {};
    for (let i = 0; i < due.length; i += 50) {
      const r = await get('en.wikipedia.org', 'action=query&prop=pageprops&ppprop=wikibase_item|disambiguation&redirects=1&titles=' + encodeURIComponent(due.slice(i, i + 50).join('|')));
      const back = {};
      for (const m of [...(r.query?.normalized || []), ...(r.query?.redirects || [])]) back[m.to] = back[m.from] || m.from;
      for (const pg of r.query?.pages || []) {
        const k = back[pg.title] || pg.title;
        if (!pg.missing && !pg.pageprops?.disambiguation && pg.pageprops?.wikibase_item) qid[k] = [pg.pageprops.wikibase_item, pg.title];
        else cache[k] = { t: now };
      }
    }
    const ids = Object.values(qid).map(([q]) => q);
    const ci = {};
    for (let i = 0; i < ids.length; i += 50) {
      const r = await get('www.wikidata.org', 'action=wbgetentities&props=claims&ids=' + ids.slice(i, i + 50).join('|'));
      for (const [q, ent] of Object.entries(r.entities || {})) { const v = ent.claims?.P2697?.[0]?.mainsnak?.datavalue?.value; if (v) ci[q] = v; }
    }
    for (const [k, [q, title]] of Object.entries(qid)) cache[k] = { t: now, wp: title, ...(ci[q] ? { ci: ci[q] } : {}) };
  } catch (e) { diag.playersError = e.message; }
  // each player's role (batter, bowler, all-rounder, keeper) from the "role" line of their article's infobox
  const roleOf = v => /all.?round/i.test(v) ? 'ar' : /wicket|keeper/i.test(v) ? 'wk' : /bowl/i.test(v) ? 'bowl' : /bat/i.test(v) ? 'bat' : '';
  const needRole = [...new Set(players.map(key))].filter(k => cache[k]?.wp && cache[k].rl === undefined).slice(0, 150);
  try {
    for (let i = 0; i < needRole.length; i += 20) {
      const batch = needRole.slice(i, i + 20);
      const byTitle = Object.fromEntries(batch.map(k => [cache[k].wp, k]));
      const r = await get('en.wikipedia.org', 'action=query&prop=revisions&rvprop=content&rvslots=main&rvsection=0&titles=' + encodeURIComponent(Object.keys(byTitle).join('|')));
      for (const pg of r.query?.pages || []) {
        const k = byTitle[pg.title];
        if (!k) continue;
        const m = (pg.revisions?.[0]?.slots?.main?.content || '').match(/^\s*\|\s*role\s*=\s*(.+)$/im);
        cache[k].rl = m ? roleOf(m[1].replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')) : '';
      }
    }
  } catch (e) { diag.playerRolesError = e.message; }
  let linked = 0;
  let roled = 0;
  for (const p of players) { const c = cache[key(p)]; if (c?.ci) { p.ci = c.ci; linked++; } if (c?.wp) p.wp = c.wp; if (c?.rl) { p.role ||= c.rl; roled++; } delete p.w; }
  diag.players = `${linked}/${players.length} squad places linked to Cricinfo, ${roled} with a role; ${due.length} looked up, ${needRole.length} roles read`;
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
// golf: each finished tournament's top 10 (and ties), from the result text TheSportsDB keeps on the event. Looked up by
// name a few a run (the free key is slow) and kept in .cache/golf-top10.json; a miss is asked again a day later, as
// results can take a while to go in
{
  const url = new URL('.cache/golf-top10.json', ROOT), LEAGUE = { pgatour: /^PGA Tour$/i, lpga: /^LPGA/i, golfanz: /Australasia|Australian PGA/i };
  let cache = {}; try { cache = JSON.parse(await readFile(url, 'utf8')); } catch {}
  const rowsOf = text => String(text || '').split('\n').map(l => l.split('\t').map(x => x.trim()).filter(Boolean)).filter(c => c.length >= 4 && /^T?\d+$/.test(c[0]))
    .map(c => ({ p: c[0], n: c[1], par: c[2], r: c.slice(3, -1), t: c[c.length - 1], ...(KIWI_GOLF.test(c[1]) ? { nz: true } : {}) }));
  const done = events.filter(e => e.sport === 'golf' && e.status === 'final' && now - Date.parse(e.startUTC) < 60 * DAY);
  let asked = 0, got = 0, note = '';
  for (const e of done) {
    const c = cache[e.id];
    if (c?.rows) { e.leaders = c.rows; got++; continue; }
    if (asked >= 3 || (c && now - c.t < DAY)) continue;
    asked++;
    try {
      const end = Date.parse(e.startUTC), d = await tsdb(`searchevents.php?e=${encodeURIComponent(e.home.replace(/ /g, '_'))}&s=${new Date(end).getUTCFullYear()}`, { extra: true });
      const ev = (d.event || []).find(x => (LEAGUE[e.team] || /./).test(x.strLeague || '') && Math.abs(Date.parse(x.dateEvent) - end) < 12 * DAY && /final round/i.test(x.strResult || ''));
      const rows = rowsOf(ev?.strResult);
      cache[e.id] = rows.length >= 5 ? { t: now, rows } : { t: now };
      if (rows.length >= 5) { e.leaders = rows; got++; }
    } catch (err) { note = ' (' + err.message + ')'; break; }
  }
  diag.golfTop10 = `${got} of ${done.length} finished tournaments have a top 10; ${asked} looked up${note}`;
  try { await mkdir(new URL('.cache/', ROOT), { recursive: true }); await writeFile(url, JSON.stringify(cache)); } catch {}
}
await addLogos(events, tsdbAll);
await addFaces(events);
// Australian state sides' squads, from their team pages while they have Shield or One-Day Cup games near. Kept once
// in the feed rather than on every game; the page puts them on each game
const stateList = events.some(e => e.team === 'audomestic' && Math.abs(Date.parse(e.startUTC) - now) < 30 * DAY)
  ? Object.entries(await stateSquads(diag)).map(([team, players]) => ({ team, players })) : [];
// other sides' current squads (NZ domestic cricket, the Big Bash, NBL, A-League, national and Super Rugby sides), from
// their own pages, for sides with a game within four weeks; kept once in the feed, the page puts them on each game
const WOMEN = new Set(['blackferns', 'whiteferns', 'kiwiferns', 'wbbl', 'fpc', 'blacksticksw', 'tallferns', 'silverferns', 'anzprem']);
const genderKey = e => /wheelchair/i.test(e.comp || '') ? 'wc' : WOMEN.has(e.team) || /women|\bWBBL\b/i.test(`${e.comp} ${e.home} ${e.away}`) ? 'w' : 'm';
const squadKeys = [...new Set(events.filter(e => Math.abs(Date.parse(e.startUTC) - now) < 30 * DAY)
  .flatMap(e => [e.home, e.away].map(t => `${e.sport}|${genderKey(e)}|${String(t || '').replace(/\s+Women('s)?$/, '')}`)))];
const teamList = await teamSquads(squadKeys, diag);
await addPlayerLinks(events, [...stateList, ...teamList]);
await addFighterLinks(events);
const links = await teamLinks(events);
await wikiLogos(events, links);

// site version: the number of commits, and when the code last changed (needs the full git history in CI)
let site = null;
try { site = { version: +execSync('git rev-list --count HEAD').toString().trim(), changedAt: execSync('git log -1 --format=%cI').toString().trim() }; } catch {}

// Form guide: each side's last five results, oldest first, from every finished game the sources gave this season (not
// just the three weeks the feed keeps). Scores decide rugby, league and football; cricket goes by "X won by". Only sides
// still in the feed are kept, and the page hides any result that spoilers cover.
const outcome = e => {
  if (e.sport === 'cricket') {
    const t = e.summary || '';
    if (/no result|abandoned|cancel/i.test(t)) return null;
    const w = (t.match(/^(.*?)\s+won\b(?! the toss)/i) || t.match(/(.*?)\s+won the super over/i) || [])[1];
    if (w) { const k = norm(w); const h = norm(e.home), a = norm(e.away); return k && (h.includes(k) || k.includes(h)) ? ['W', 'L'] : k && (a.includes(k) || k.includes(a)) ? ['L', 'W'] : null; }
    return /drawn|\bdraw\b|\btied?\b/i.test(t) ? ['D', 'D'] : null;
  }
  const m = String(e.score || '').match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (!m) return null;
  return +m[1] > +m[2] ? ['W', 'L'] : +m[1] < +m[2] ? ['L', 'W'] : ['D', 'D'];
};
const formAll = {};
for (const e of events.filter(e => e.status === 'final' && /^(rugby|league|football|cricket)$/.test(e.sport)).sort((a, b) => a.startUTC.localeCompare(b.startUTC))) {
  const r = outcome(e);
  if (!r) continue;
  // cricket form is kept per format, so a Test shows Test results and a T20I shows T20I ones
  const f = e.sport !== 'cricket' ? '' : (c => /\bT20/i.test(c) ? 'T20I' : /\bODI\b|one.day/i.test(c) ? 'ODI' : /\bTest\b/.test(c) ? 'Test' : '')(`${e.comp || ''} ${e.stage || ''}`);
  for (const [me, them, res] of [[e.home, e.away, r[0]], [e.away, e.home, r[1]]]) (formAll[`${e.sport}|${me}`] ||= []).push({ id: e.id, d: e.startUTC.slice(0, 10), o: them, r: res, s: e.score || '', ...(f ? { f } : {}) });
}
const inFeed = new Set(events.filter(e => now - new Date(e.startUTC) < 21 * DAY).flatMap(e => [`${e.sport}|${e.home}`, `${e.sport}|${e.away}`]));
const form = Object.fromEntries(Object.entries(formAll).filter(([k]) => inFeed.has(k)).map(([k, v]) => [k, v.slice(k.startsWith('cricket|') ? -20 : -6)]));
diag.form = `${Object.keys(form).length} sides with a form guide`;

// world rankings (Wikipedia), each page re-read every 12 hours
const rankUrl = new URL('.cache/rankings.json', ROOT);
let rankCache = {};
try { rankCache = JSON.parse(await readFile(rankUrl, 'utf8')); } catch {}
let rankings = [];
try { rankings = await getRankings(rankCache, diag); } catch (e) { diag.rankings = 'error: ' + e.message; }
try { await mkdir(new URL('.cache/', ROOT), { recursive: true }); await writeFile(rankUrl, JSON.stringify(rankCache)); } catch {}

// motorsport has no world rankings, so its Rankings are the championship standings: this season's once a race has been
// run, else last season's final table (each series' last full table is kept in .cache/motor-standings.json)
try {
  const motorUrl = new URL('.cache/motor-standings.json', ROOT);
  let motorCache = {};
  try { motorCache = JSON.parse(await readFile(motorUrl, 'utf8')); } catch {}
  const lastRace = comp => events.filter(e => (e.comp || '').startsWith(comp) && e.status === 'final').map(e => e.startUTC.slice(0, 10)).sort().pop() || '';
  const out = [], Y = new Date(now).getUTCFullYear();
  for (const [comp, from, title, head, org] of [['Formula 1', "Drivers' championship", 'F1 drivers', 'Driver', 'FIA'], ['Formula 1', "Constructors' championship", 'F1 teams', 'Team', 'FIA'], ['Supercars', "Drivers' championship", 'Supercars drivers', 'Driver', 'Supercars'], ['Supercars', "Teams' championship", 'Supercars teams', 'Team', 'Supercars']]) {
    const t = tables.find(x => x.comp === comp && x.title === from), asOf = lastRace(comp);
    // standings with points before this year's first race are last season's, still on Wikipedia's template
    const season = asOf.startsWith(String(Y)) ? Y : Y - 1;
    if (t && t.rows.some(r => r.pts > 0)) motorCache[title] = { season, page: t.page.replace(/^\d{4}/, season), asOf: asOf || motorCache[title]?.asOf || '', rows: t.rows.slice(0, 20).map((r, i) => ({ rank: String(i + 1), name: r.name, val: String(r.pts), ...(r.nz ? { nz: true } : {}) })) };
    const c = motorCache[title];
    if (c) out.push({ sport: 'motor', kind: 'players', head, org, title: c.season < Y ? `${title} ${c.season}` : title, page: c.page, asOf: c.asOf, valLabel: 'Points', rows: c.rows });
  }
  rankings.push(...out);
  diag.motorRankings = out.map(l => `${l.title} ${l.page}: ${l.rows.length} (top ${l.rows[0]?.name})`).join('; ') || 'none';
  await writeFile(motorUrl, JSON.stringify(motorCache));
} catch (e) { diag.motorRankings = 'error: ' + e.message; }

// a season's finals stay up through the off-season (about five months), so a finished competition still shows how it ended
// finals (and baseball's playoff series) stay in the feed all season, for the Playoffs tab
const isFinal = e => /\bfinals?\b|semi.?final|grand final|qualifying final|elimination final|preliminary final/i.test(`${e.comp || ''} ${e.stage || ''} ${e.round || ''}`) || /^(MLB playoffs|Japan Series)$/.test(e.comp || '');
try { await writeCalendars(events); } catch (e) { diag.calendars = 'error: ' + e.message; }
try { await phoneAlerts(events); } catch (e) { diag.alerts = 'error: ' + e.message; }
// Coverage, for the stats page: of the games in the next three weeks, how many have a set start time, a way to watch
// and squads, and of the sides playing them how many have a picture (logo, flag or photo) and team links; with what's
// missing, by sport, so the gaps are easy to see and hunt down
const NATIONAL = /^(All Blacks|Black Ferns|Black Caps|White Ferns|Kiwis|Kiwi Ferns|Wallabies|Wallaroos|Kangaroos|Jillaroos|Springboks|Proteas|Windies|Silver Ferns|Tall Blacks|Tall Ferns|Black Sticks|Socceroos|Matildas|All Whites|Football Ferns|Diamonds|Boomers|Opals|Kookaburras|Hockeyroos|PNG .+|Fiji .+|Toa Samoa|Cook Islands .+|Lebanon Cedars)$/;
const NOT_SIDE = /^(TBC|TBA|TBD)\b|winner|loser|placed|group|pool|semi-final|runners?[- ]up|qualifier|knockout|challenger|^\d(st|nd|rd|th)\b|\bXI$/i;
const NO_SQUADS = new Set(['motor', 'tennis', 'mma', 'boxing']);
const haveSquads = new Set([...teamList.map(s => `${s.sport}|${s.g}|${s.team}`), ...stateList.map(s => `cricket|m|${s.team}`)]);
const coverage = {}, seenSide = new Set();
const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };
for (const e of events.filter(x => { const t = Date.parse(x.startUTC) - now; return t > -DAY && t < 21 * DAY && x.status !== 'final'; })) {
  const c = coverage[e.sport] ||= { games: 0, time: 0, watch: 0, sqGames: 0, squads: 0, sides: 0, pic: 0, links: 0, gaps: { time: {}, watch: {}, squads: {}, pic: [], links: [] } };
  const comp = String(e.comp || e.team || '').replace(/\s*[,·(].*$/, '').trim();
  c.games++;
  if (!e.timeTBC) c.time++; else bump(c.gaps.time, comp);
  if ((e.broadcast && e.broadcast !== 'TBC') || e.watchAlt || e.yt || e.tv) c.watch++; else bump(c.gaps.watch, comp);
  if (e.tv) c.guide = (c.guide || 0) + 1;
  if (e.yt) c.streams = (c.streams || 0) + 1;
  // a race, a tournament or a regatta has no two sides (golf's "home" is the tournament's name)
  if (['motor', 'tennis', 'golf', 'sailing'].includes(e.sport)) continue;
  const sides = [e.home, e.away].filter(t => t && !NOT_SIDE.test(t)), g = genderKey(e), base = t => String(t).replace(/\s+Women('s)?$/, '');
  if (!NO_SQUADS.has(e.sport) && sides.length) { c.sqGames++; if (e.squads?.length || sides.some(t => haveSquads.has(`${e.sport}|${g}|${base(t)}`))) c.squads++; else bump(c.gaps.squads, comp); }
  for (const t of sides) {
    const k = `${e.sport}|${t}`; if (seenSide.has(k)) continue; seenSide.add(k); c.sides++;
    const pic = (t === e.home ? e.homeLogo || e.homeBadge : e.awayLogo || e.awayBadge) || COUNTRY.test(base(t).replace(/\s+(A|XV)$/, '')) || NATIONAL.test(base(t));
    if (pic) c.pic++; else c.gaps.pic.push(t);
    // a fighter's links ride on the fight card's entries for them (Wikipedia, BoxRec, Sherdog...)
    const fighterLinked = ['mma', 'boxing'].includes(e.sport) && simple(t) && (e.card || []).some(f => ['a', 'b'].some(x => f[x + 'Links'] && simple(f[x]).includes(simple(t))));
    if (!NO_SQUADS.has(e.sport) || ['mma', 'boxing'].includes(e.sport)) { if (fighterLinked || links[k] || links[`${e.sport}|${base(t)}`] || COUNTRY.test(base(t)) || NATIONAL.test(base(t))) c.links++; else c.gaps.links.push(t); }
  }
}
for (const c of Object.values(coverage)) for (const k of ['time', 'watch', 'squads']) c.gaps[k] = Object.entries(c.gaps[k]).sort((a, b) => b[1] - a[1]);

const feed = {
  generatedAt: new Date(now).toISOString(),
  ...(site ? { site } : {}),
  diag: { ...diag, liveSourceEvents: live.length, eventsByTeam: events.reduce((m, e) => (m[e.team] = (m[e.team] || 0) + 1, m), {}) },
  events: events.filter(e => !e.formOnly && now - new Date(e.startUTC) < (isFinal(e) ? 150 : 21) * DAY),
  form,
  news,
  tables,
  rankings,
  ...(stateList.length ? { stateSquads: stateList } : {}),
  ...(teamList.length ? { teamSquads: teamList } : {}),
  teamLinks: links,
  coverage,
  sources: [
    { name: 'Wikipedia (CC BY-SA)', url: 'https://en.wikipedia.org' }, { name: 'TheSportsDB', url: 'https://www.thesportsdb.com' }, { name: 'TV guide: i.mjh.nz (NZ XMLTV)', url: 'https://i.mjh.nz/' }, { name: 'Streams: YouTube', url: 'https://www.youtube.com' }, ...(ESPN_ON ? [{ name: 'Live cricket: ESPNcricinfo', url: 'https://www.espncricinfo.com' }] : []), ...(RNZ_ON ? [{ name: 'RNZ Sport', url: 'https://www.rnz.co.nz/news/sport' }] : []), { name: 'Headlines supplied by nzherald.co.nz', url: 'https://www.nzherald.co.nz/sport/' }, { name: 'Press releases via Scoop Media', url: 'https://www.scoop.co.nz/' }, ...FIGHT_FEEDS.map(([name, host]) => ({ name: `Fight headlines: ${name}`, url: `https://${host}/` })), { name: 'NBA and MLB headlines: SB Nation', url: 'https://www.sbnation.com/' },
    { name: 'NZ Rugby', url: 'https://www.allblacks.com' }, { name: 'NZ Cricket', url: 'https://www.nzc.nz' },
    { name: 'NRL', url: 'https://www.nrl.com' }, { name: 'NBA games: balldontlie', url: 'https://www.balldontlie.io' },
    ...[...logoCredits].map(([name, url]) => ({ name, url })),
  ],
};
await writeFile(new URL('data/feed.json', ROOT), JSON.stringify(feed));
// the version alone, for pages that only need that (the stats page)
await writeFile(new URL('data/version.json', ROOT), JSON.stringify(site));
// the coverage figures alone, small, for the stats server to keep one snapshot a version (the stats page charts them):
// per sport [games, start times, where to watch, games needing squads, with squads, sides, with pictures, with links,
// in the TV guide, free streams]
await writeFile(new URL('data/coverage.json', ROOT), JSON.stringify({ v: site?.version || 0, at: feed.generatedAt,
  cov: Object.fromEntries(Object.entries(coverage).map(([k, c]) => [k, [c.games, c.time, c.watch, c.sqGames, c.squads, c.sides, c.pic, c.links, c.guide || 0, c.streams || 0]])) }));
// a small plain-text view of games around now, for checking the live site without reading the whole feed
await writeFile(new URL('data/now.txt', ROOT), feed.events.filter(e => Math.abs(Date.parse(e.startUTC) - now) < 2 * DAY)
  .map(e => [e.id, e.team, e.status, e.startUTC, e.timeTBC ? 'TBC' : '', e.format || '', e.stage || '', e.city || '', e.tz || '', e.score || '', e.summary || '', e.weather || '', e.progress || '', e.liveScore || ''].join(' | ')).join('\n') + '\n');

// plain-text check of the fight sections: nearby cards, photos still missing and fight headlines
await writeFile(new URL('data/fights.txt', ROOT), [
  '# cards within 30 days',
  ...feed.events.filter(e => /^(mma|boxing)$/.test(e.sport) && Math.abs(Date.parse(e.startUTC) - now) < 30 * DAY)
    .map(e => [e.startUTC.slice(0, 10), e.comp, `${e.home} v ${e.away}`, e.status, e.score || '', `${(e.card || []).length} bouts`, `photos ${[e.homeLogo, e.awayLogo, ...(e.card || []).flatMap(b => [b.aImg, b.bImg])].filter(Boolean).length}`, e.about ? 'intro' : ''].join(' | ')),
  '', `# ${diag.faces}`, `# ${diag.facesSearch || ''} / openverse: ${diag.facesOpenverse || ''}`, ...(diag.facesMissing || []),
  '', `# fight headlines (${diag.fightNews || ''})`, ...feed.news.filter(n => /^(ufc|boxing|nzboxing)$/.test(n.team)).map(n => [n.date, n.team, n.source, n.title].join(' | ')),
].join('\n') + '\n');

// "hot" while a game is on or about to start (Tests count for five days), so the workflow refreshes every
// 10 minutes then and only now and again otherwise, sparing Wikipedia and TheSportsDB needless requests
// the busy overseas leagues (off unless picked) wait for the slower schedule
const QUIET = /^(mlb|npb|nba)$/;
const hot = feed.events.some(e => {
  if (e.status === 'final' || QUIET.test(e.team)) return false;
  const age = now - new Date(e.startUTC);
  const span = e.sport === 'cricket' && /\bTests?\b/.test(`${e.stage || ''} ${e.comp || ''}`) ? 5 * DAY : 12 * 36e5;
  return age > -90 * 6e4 && age < span;
});
// "live": a game in its playing window right now (for a Test, the first 10 hours of each day), so refresh every 5 minutes
const PLAY_H = { rugby: 2.5, league: 2.5, football: 2.5, hockey: 2, basketball: 2.5, netball: 1.5, mma: 6, boxing: 5, motor: 3 };
const playing = feed.events.some(e => {
  if (e.status === 'final' || QUIET.test(e.team)) return false;
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
// what the tennis and squad-role readers found, as run annotations (readable on the run page without the full log)
if (process.env.GITHUB_ACTIONS) {
  console.log(`::notice title=Players::${String(diag.players || '')} ${diag.playerRolesError || ''}`);
  console.log(`::notice title=Tables::${String(Array.isArray(diag.tables) ? diag.tables.join('; ') : diag.tables || '').replace(/[\r\n%]/g, ' ').slice(0, 3000)}`);
  const intl = feed.events.filter(e => e.team === 'intlcricket').sort((a, b) => a.startUTC.localeCompare(b.startUTC));
  console.log(`::notice title=IntlCricket::${intl.length} games: ${intl.map(e => `${e.startUTC.slice(0, 10)} ${e.comp}${e.stage ? ' / ' + e.stage : ''}: ${e.home} v ${e.away} [${e.status}]`).join(' ; ').replace(/[\r\n%]/g, ' ').slice(0, 4000)}`);
  console.log(`::notice title=CricketLogos::${String(diag.cricketLogos || 'none').replace(/[\r\n%]/g, ' ').slice(0, 2000)}`);
  console.log(`::notice title=Scoop::${String(diag.scoop || 'not run').replace(/[\r\n%]/g, ' ').slice(0, 1000)}`);
  console.log(`::notice title=Faces::${String(diag.facesMain || '').replace(/[\r\n%]/g, ' ').slice(0, 4000)}`);
  console.log(`::notice title=Tennis::${String(diag.tennis || 'not run').replace(/[\r\n%]/g, ' ').slice(0, 4000)}`);
}
