// probe 4: what is live right now on the published feed, and which outside sources answer from GitHub's runners
const BROWSER = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', accept: 'application/json, text/html, application/xml;q=0.9, */*;q=0.8', 'accept-language': 'en-NZ,en;q=0.9' };
const BOT = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const now = Date.now();
const get = async (url, headers = BOT, ms = 15000) => {
  try { const r = await fetch(url, { headers, signal: AbortSignal.timeout(ms), redirect: 'follow' }); return { s: r.status, ct: r.headers.get('content-type') || '', t: await r.text(), u: r.url }; }
  catch (e) { return { s: 'ERR ' + (e.cause?.code || e.message), ct: '', t: '' }; }
};
const one = s => String(s || '').replace(/\s+/g, ' ').trim();
const ctx = (t, re, n = 3, w = 160) => [...t.matchAll(new RegExp(re, 'gi'))].slice(0, n).map(m => one(t.slice(Math.max(0, m.index - w), m.index + w))).join('  ||  ');

// ---------- A. the published feed ----------
console.log('#### A. LIVE FEED');
const f = await get('https://7n1k7.github.io/sports-feed/data/feed.json?x=' + now);
let feed = null;
try { feed = JSON.parse(f.t); } catch { console.log('feed', f.s, f.t.slice(0, 200)); }
if (feed) {
  console.log('generated', feed.generated || feed.updated || '', 'events', feed.events?.length, 'news', feed.news?.length, 'keys', Object.keys(feed).join(','));
  const near = (feed.events || []).filter(e => e.status === 'live' || Math.abs(Date.parse(e.startUTC) - now) < 16 * 36e5);
  for (const e of near) { const { card, squads, ...rest } = e; console.log('EV', JSON.stringify(rest).slice(0, 1500)); }
  console.log('\n## diag');
  for (const [k, v] of Object.entries(feed.diag || {})) console.log('DIAG', k, '=', JSON.stringify(v).slice(0, 2500));
  console.log('\n## teams with no crest, by sport (next 60 days and last 14)');
  const miss = {};
  for (const e of feed.events || []) {
    const t = Date.parse(e.startUTC); if (t < now - 14 * 864e5 || t > now + 60 * 864e5) continue;
    if (/^(motor|tennis)$/.test(e.sport)) continue;
    for (const k of ['home', 'away']) if (e[k] && !e[k + 'Logo'] && !e[k + 'Badge']) (miss[e.sport] ||= {})[e[k]] = ((miss[e.sport] ||= {})[e[k]] || 0) + 1;
  }
  for (const [s, m] of Object.entries(miss)) console.log('NOLOGO', s, Object.entries(m).sort((a, b) => b[1] - a[1]).map(([n, c]) => `${n}(${c})`).join(', '));
  const cardMiss = new Set();
  for (const e of feed.events || []) { const t = Date.parse(e.startUTC); if (t < now - 3 * 864e5 || t > now + 35 * 864e5) continue; for (const b of e.card || []) for (const k of ['a', 'b']) if (b[k] && !b[k + 'Img']) cardMiss.add(`${e.comp}: ${b[k]}`); }
  console.log('NOFACE (cards, next 5 weeks)', cardMiss.size, [...cardMiss].join(' ; ').slice(0, 5000));
}

// ---------- B. live cricket ----------
console.log('\n#### B. LIVE CRICKET');
const CRICKET = [
  ['cricinfo current', 'https://hs-consumer-api.espncricinfo.com/v1/pages/matches/current?lang=en&latest=true', BROWSER],
  ['cricinfo live rss', 'https://static.espncricinfo.com/rss/livescores.xml', BOT],
  ['espn cricket header', 'https://site.web.api.espn.com/apis/v2/scoreboard/header?sport=cricket&lang=en&region=au', BROWSER],
  ['espn cricket scorepanel', 'https://site.web.api.espn.com/apis/site/v2/sports/cricket/scorepanel?lang=en&region=au', BROWSER],
  ['espn cricket scoreboard', 'https://site.api.espn.com/apis/site/v2/sports/cricket/scoreboard', BROWSER],
  ['cricbuzz live', 'https://www.cricbuzz.com/api/cricket-match/live-matches', BROWSER],
  ['cricbuzz old json', 'https://www.cricbuzz.com/match-api/livematches.json', BROWSER],
  ['tsdb livescore', 'https://www.thesportsdb.com/api/v1/json/123/livescore.php?s=Cricket', BOT],
];
for (const [name, url, h] of CRICKET) {
  const r = await get(url, h);
  console.log(`\n== ${name} ${r.s} ${r.ct} ${r.t.length}b ${r.u && r.u !== url ? '-> ' + r.u : ''}`);
  console.log('HEAD', one(r.t.slice(0, 900)));
  if (/rain|delay|stumps|innings break/i.test(r.t)) console.log('STATE', ctx(r.t, 'rain|delay|stumps|innings break', 6));
  if (/new zealand|australia women|canterbury|otago|wellington|auckland|northern|central/i.test(r.t)) console.log('NZ', ctx(r.t, 'new zealand|australia women|canterbury|otago|wellington blaze|auckland|northern|central (stags|hinds)', 6, 200));
}

// ---------- C. news feeds ----------
console.log('\n#### C. NEWS FEEDS');
const TEAMS = /All Blacks|Black Ferns|\bNPC\b|Farah Palmer|Blues|Chiefs|Hurricanes|Crusaders|Highlanders|Moana Pasifika|Black ?Caps|White Ferns|Plunket|Ford Trophy|Super Smash|Kiwis|Kiwi Ferns|Warriors|Liam Lawson|Wallabies|Super Rugby|NRL|Big Bash|WBBL|Phoenix|Auckland FC|A-League|Joseph Parker|David Nyika|Adesanya|Kara-France|Dan Hooker|Carlos Ulberg|\bUFC\b|boxing|New Zealand/i;
const FEEDS = [
  'https://www.stuff.co.nz/rss', 'https://www.stuff.co.nz/sport/rss', 'https://www.stuff.co.nz/rss/sport',
  'https://www.1news.co.nz/arc/outboundfeeds/rss/?outputType=xml', 'https://www.1news.co.nz/arc/outboundfeeds/rss/section/sport/?outputType=xml',
  'https://www.newstalkzb.co.nz/arc/outboundfeeds/rss/section/sport/?outputType=xml&_website=newstalkzb', 'https://www.newstalkzb.co.nz/rss/sport',
  'https://www.odt.co.nz/rss.xml', 'https://www.odt.co.nz/sport/rss', 'https://www.odt.co.nz/rss/sport',
  'https://newsroom.co.nz/feed/', 'https://newsroom.co.nz/category/lockerroom/feed/', 'https://thespinoff.co.nz/sports/feed', 'https://thespinoff.co.nz/feed',
  'https://www.skysport.co.nz/rss', 'https://www.allblacks.com/rss', 'https://www.nzc.nz/rss', 'https://www.warriors.kiwi/rss',
  'https://feeds.bbci.co.uk/sport/rugby-union/rss.xml', 'https://feeds.bbci.co.uk/sport/cricket/rss.xml', 'https://feeds.bbci.co.uk/sport/rugby-league/rss.xml',
  'https://feeds.bbci.co.uk/sport/boxing/rss.xml', 'https://feeds.bbci.co.uk/sport/mixed-martial-arts/rss.xml', 'https://feeds.bbci.co.uk/sport/formula1/rss.xml',
  'https://www.theguardian.com/sport/rugby-union/rss', 'https://www.theguardian.com/sport/cricket/rss', 'https://www.theguardian.com/sport/rugbyleague/rss',
  'https://www.theguardian.com/sport/boxing/rss', 'https://www.theguardian.com/sport/mma/rss', 'https://www.theguardian.com/sport/formulaone/rss', 'https://www.theguardian.com/world/newzealand/rss',
  'https://www.espncricinfo.com/rss/content/story/feeds/0.xml', 'https://www.espncricinfo.com/rss/content/story/feeds/5.xml',
  'https://www.espn.com/espn/rss/mma/news', 'https://www.espn.com/espn/rss/boxing/news', 'https://www.espn.com/espn/rss/rpm/news',
  'https://www.zerotackle.com/feed/', 'https://www.rugbypass.com/feed/', 'https://rugby365.com/feed/', 'https://www.sherdog.com/rss/news.xml', 'https://mmajunkie.usatoday.com/feed',
  'https://www.boxingscene.com/feed', 'https://www.boxingnews24.com/feed/', 'https://bloodyelbow.com/feed/', 'https://www.ringmagazine.com/feed',
  'https://www.formula1.com/en/latest/all.xml', 'https://www.motorsport.com/rss/f1/news/', 'https://www.autosport.com/rss/f1/news/',
  'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-NZ&gl=NZ&ceid=NZ:en', 'https://news.google.com/rss/search?q=Warriors+NRL&hl=en-NZ&gl=NZ&ceid=NZ:en',
];
for (const url of FEEDS) {
  const r = await get(url, BOT);
  const items = [...r.t.matchAll(/<(item|entry)[\s>]([\s\S]*?)<\/\1>/g)].map(m => m[2]);
  const title = x => one((x.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1]).replace(/<!\[CDATA\[|\]\]>/g, '');
  const date = x => (x.match(/<(pubDate|published|updated|dc:date)[^>]*>([\s\S]*?)<\//) || [])[2];
  const img = items.filter(x => /<(media:content|media:thumbnail|enclosure)[^>]*url=|<img/i.test(x)).length;
  const match = items.filter(x => TEAMS.test(title(x))).length;
  const newest = items.map(date).map(d => Date.parse(d)).filter(Boolean).sort((a, b) => b - a)[0];
  const r2 = !items.length && /^4|^ERR/.test(String(r.s)) ? await get(url, BROWSER) : null;
  console.log(`FEED ${r.s}${r2 ? '/browser ' + r2.s : ''} ${items.length} items, ${img} with images, ${match} naming our teams, newest ${newest ? new Date(newest).toISOString().slice(0, 16) : '-'} ${url}`);
  if (items.length) console.log('   e.g.', items.slice(0, 4).map(title).join(' | ').slice(0, 400));
  else console.log('   ', r.ct, one(r.t.slice(0, 200)));
}

// ---------- D. live data APIs ----------
console.log('\n#### D. DATA APIS');
const APIS = [
  ['espn rugby all', 'https://site.api.espn.com/apis/site/v2/sports/rugby/scoreboard'],
  ['espn super rugby', 'https://site.api.espn.com/apis/site/v2/sports/rugby/242041/scoreboard'],
  ['espn npc 270557', 'https://site.api.espn.com/apis/site/v2/sports/rugby/270557/scoreboard'],
  ['espn rugby league nrl', 'https://site.api.espn.com/apis/site/v2/sports/rugby-league/3/scoreboard'],
  ['espn ufc', 'https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard'],
  ['espn a-league', 'https://site.api.espn.com/apis/site/v2/sports/soccer/aus.1/scoreboard'],
  ['espn f1', 'https://site.api.espn.com/apis/site/v2/sports/racing/f1/scoreboard'],
  ['world rugby rankings', 'https://api.wr-rugby.com/rugby/v1/rankings/mru'],
  ['world rugby matches', `https://api.wr-rugby.com/rugby/v3/match?startDate=${new Date(now - 3 * 864e5).toISOString().slice(0, 10)}&endDate=${new Date(now + 7 * 864e5).toISOString().slice(0, 10)}&sort=asc&pageSize=50`],
  ['nrl draw', 'https://www.nrl.com/draw/data?competition=111&season=2026'],
  ['fixturedownload nrl', 'https://fixturedownload.com/feed/json/nrl-2026'],
  ['fixturedownload super rugby', 'https://fixturedownload.com/feed/json/super-rugby-2026'],
  ['fixturedownload bbl', 'https://fixturedownload.com/feed/json/bbl-2026'],
  ['jolpica f1 next', 'https://api.jolpi.ca/ergast/f1/current/next.json'],
  ['openf1 drivers', 'https://api.openf1.org/v1/drivers?session_key=latest'],
];
for (const [name, url] of APIS) {
  const r = await get(url, BROWSER);
  console.log(`\n== ${name} ${r.s} ${r.ct} ${r.t.length}b`);
  console.log('HEAD', one(r.t.slice(0, 700)));
  if (/rain|delay/i.test(r.t)) console.log('STATE', ctx(r.t, 'rain|delay', 3));
}
console.log('\ndone', new Date().toISOString());
