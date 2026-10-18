// F1 probe: raw wikitext rows, TheSportsDB F1 shape, then a full feed build with F1 on
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const UA = { 'User-Agent': 'sports-feed probe (https://7n1k7.github.io/sports-feed/)' };
const get = async t => { const u = 'https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&format=json&formatversion=2&titles=' + encodeURIComponent(t); const j = await (await fetch(u, { headers: UA })).json(); return j.query.pages[0].revisions?.[0].slots.main.content || ''; };
const f1 = await get('2026 Formula One World Championship');
let i = f1.search(/==\s*Calendar\s*==/i); console.log('#### CALENDAR'); console.log(f1.slice(i, i + 3000));
i = f1.search(/===\s*Grands Prix\s*===/i); console.log('#### GRANDS PRIX'); console.log(f1.slice(i, i + 2500));
const t = await get('Template:F1 Drivers Standings'); console.log('#### DRIVERS', t.length); console.log(t.slice(0, 2500));
const c = await get('Template:F1 Constructors Standings'); console.log('#### CONS', c.length); console.log(c.slice(0, 1200));
const T = 'https://www.thesportsdb.com/api/v1/json/123/';
for (const q of ['eventsseason.php?id=4370&s=2026', 'eventsnextleague.php?id=4370']) {
  try {
    const r = await fetch(T + q, { headers: UA });
    const j = await r.json();
    const evs = j.events || [];
    console.log('#### TSDB', q, r.status, evs.length);
    if (evs[0]) console.log(JSON.stringify(evs[0]).slice(0, 1500));
    for (const e of evs) console.log([e.idEvent, e.strEvent, e.dateEvent, e.strTime, e.strTimestamp, e.strVenue, e.strCity, e.strCountry, e.intRound, e.strStatus].join(' | '));
  } catch (e) { console.log('#### TSDB', q, 'error', e.message); }
  await new Promise(r => setTimeout(r, 7000));
}
console.log('#### FETCH');
try { console.log(execSync('node scripts/fetch.mjs', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })); } catch (e) { console.log('fetch failed', e.message, e.stdout, e.stderr); }
const feed = JSON.parse(readFileSync('data/feed.json', 'utf8'));
console.log('#### DIAG'); console.log(JSON.stringify({ f1: feed.diag.f1, tables: feed.diag.tables, wikipedia: feed.diag.wikipedia }, null, 1));
console.log('#### F1 EVENTS');
for (const e of feed.events.filter(e => e.team === 'f1')) console.log(JSON.stringify(e));
console.log('#### F1 TABLES');
for (const tb of feed.tables.filter(x => x.team === 'f1')) console.log(tb.title, tb.style, JSON.stringify(tb.rows.slice(0, 4).map(r => [r.name, r.pts])), tb.rows.length);
console.log('#### FEEDJSON');
console.log(JSON.stringify(feed));
