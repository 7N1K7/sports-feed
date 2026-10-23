// probe 123: ranking pages for baseball and golf (tables and what the parser makes of them), and the live feed's NBA/MLB news
import { _tablesOf, _teamTables, _playerTables } from './rankings.mjs';
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
for (const page of ['WBSC World Rankings', 'WBSC Baseball World Rankings', 'Official World Golf Ranking', "Women's World Golf Rankings", 'Rolex Rankings', 'FIBA World Ranking']) {
  try {
    const r = await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=parse&prop=text&redirects=1&disableeditsection=1&page=' + encodeURIComponent(page), { headers: UA });
    const j = await r.json();
    if (j.error) { console.log(`== ${page}: ${j.error.code}`); continue; }
    const tables = _tablesOf(j.parse?.text || '');
    console.log(`== ${page} (${j.parse?.title}): ${tables.length} tables`);
    for (const t of tables.slice(0, 8)) console.log('  [' + t.heading + '] heads:', JSON.stringify(t.heads).slice(0, 200), '| rows:', t.rows.length, JSON.stringify(t.rows.slice(0, 2)).slice(0, 260));
    const tt = _teamTables(tables, { sport: 'x', page, titles: ["Men's", "Women's"] });
    for (const l of tt) console.log('  teamTables:', l.title, l.asOf, l.rows.slice(0, 5).map(r => `${r.rank} ${r.name} ${r.val}`).join(' | '));
    const pt = _playerTables(tables, { sport: 'x', page, titles: ['Singles'] });
    for (const l of pt) console.log('  playerTables:', l.title, l.asOf, l.rows.slice(0, 5).map(r => `${r.rank} ${r.name} ${r.val}`).join(' | '));
  } catch (e) { console.log(`== ${page}: error ${e.message}`); }
  await new Promise(r => setTimeout(r, 1500));
}
try {
  const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
  console.log('site', JSON.stringify(f.site || {}).slice(0, 100), 'diag.usNews:', f.diag?.usNews, '| bbc:', f.diag?.bbc);
  for (const n of (f.news || []).filter(n => /^(nba|mlb|npb)$/.test(n.team)).slice(0, 25)) console.log(' ', n.date, n.team, n.source, '|', n.title);
  console.log('nba events', f.events.filter(e => e.team === 'nba').length, 'cities', [...new Set(f.events.filter(e => e.team === 'nba').map(e => e.city))].join(', '));
} catch (e) { console.log('feed error', e.message); }
