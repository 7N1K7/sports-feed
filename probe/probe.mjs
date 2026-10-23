// probe 126: golf. Ranking and points tables on Wikipedia (as the rankings parser sees them), TheSportsDB results for
// this season's finished tournaments, and the BBC golf feed
import { _tablesOf } from './rankings.mjs';
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const page of ["Women's World Golf Rankings", 'List of male golfers who have been in the world top 10', '2026 FedEx Cup Playoffs', '2025–26 PGA Tour of Australasia', '2026 LPGA Tour']) {
  try {
    const j = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=parse&prop=text&redirects=1&disableeditsection=1&page=' + encodeURIComponent(page), { headers: UA })).json();
    if (j.error) { console.log(`== ${page}: ${j.error.code}`); continue; }
    const tables = _tablesOf(j.parse?.text || '');
    console.log(`\n== ${page}: ${tables.length} tables`);
    for (const t of tables.slice(0, 12)) console.log(`  [${t.heading}] notes: ${String(t.notes || '').slice(-160).replace(/\s+/g, ' ')}\n    heads: ${JSON.stringify(t.heads).slice(0, 300)} | rows ${t.rows.length}: ${JSON.stringify(t.rows.slice(0, 3)).slice(0, 420)}`);
  } catch (e) { console.log(`== ${page}: error ${e.message}`); }
  await sleep(1200);
}
let f = { events: [] };
try { f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json(); } catch (e) { console.log('feed error', e.message); }
const golf = f.events.filter(e => e.sport === 'golf').sort((a, b) => a.startUTC.localeCompare(b.startUTC));
console.log('\n== feed golf events', golf.length);
for (const e of golf) console.log(' ', e.startUTC.slice(0, 10), e.comp, '|', e.home, '|', e.status, e.score || '', e.tv ? 'TV' : '', e.timeTBC ? 'TBC' : '');
const done = golf.filter(e => e.status === 'final' && Date.now() - Date.parse(e.startUTC) < 40 * 864e5).slice(-8);
for (const e of done) {
  const q = e.home.replace(/ /g, '_');
  try {
    const d = await (await fetch(`https://www.thesportsdb.com/api/v1/json/123/searchevents.php?e=${encodeURIComponent(q)}&s=2026`)).json();
    const evs = d.event || [];
    console.log(`\n-- ${e.home} (${e.comp}): ${evs.length} found`);
    for (const x of evs.slice(0, 4)) console.log(`   ${x.idEvent} ${x.strEvent} | ${x.strLeague} | ${x.dateEvent} ${x.strTime} | result ${String(x.strResult || '').length} chars: ${String(x.strResult || '').slice(0, 260).replace(/\n/g, ' / ')}`);
  } catch (err) { console.log(`-- ${e.home}: error ${err.message}`); }
  await sleep(2500);
}
try {
  const x = await (await fetch('https://feeds.bbci.co.uk/sport/golf/rss.xml', { headers: UA })).text();
  const items = [...x.matchAll(/<item>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/g)].map(m => m[1]);
  console.log('\n== BBC golf', items.length, items.slice(0, 6).join(' | '));
} catch (e) { console.log('BBC golf error', e.message); }
