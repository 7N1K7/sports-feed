// probe 47: the ICC women's ranking pages — which tables each one has, and what the parser takes from them
import { _tablesOf, _teamTables } from './src/rankings.mjs';
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
for (const page of ["ICC Women's ODI Team Rankings", "ICC Women's T20I Team Rankings", "ICC Men's Test Team Rankings"]) {
  const r = await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=parse&prop=text&redirects=1&page=' + encodeURIComponent(page), { headers: UA });
  const j = await r.json();
  console.log('\n==', page, '-> resolved title:', j.parse?.title, '| redirects:', JSON.stringify(j.parse?.redirects || []));
  const tables = _tablesOf(j.parse?.text || '');
  tables.forEach((t, i) => console.log(`  table ${i}: heading "${t.heading}" | notes "${t.notes.slice(-160)}" | heads ${JSON.stringify(t.heads)} | ${t.rows.length} rows | first ${JSON.stringify(t.rows[0])} | last ${JSON.stringify(t.rows[t.rows.length - 1])}`));
  const lists = _teamTables(tables, { sport: 'cricket', page, titles: ['X'] });
  for (const l of lists) console.log('  parsed:', l.title, l.asOf, l.rows.length, 'rows; last:', JSON.stringify(l.rows[l.rows.length - 1]));
  await new Promise(r => setTimeout(r, 1500));
}
