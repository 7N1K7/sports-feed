// probe 31: (a) hockey on the live site; (b) Wikipedia rankings pages for hockey, football, tennis and boxing
import { _tablesOf as tablesOf, _teamTables as teamTables } from './src/rankings.mjs';
const UA = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi/; probe)' };
try {
  const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now(), { headers: UA })).json();
  console.log('live version', f.site?.version, 'generated', f.generatedAt);
  const h = (f.events || []).filter(e => e.sport === 'hockey');
  console.log('hockey events', h.length);
  for (const e of h) console.log(' ', e.startUTC, e.timeTBC ? 'TBC' : '', e.team, '|', e.comp, e.stage || '', '|', e.home, 'v', e.away, e.status, e.score || '', '|', e.venue, e.city);
  console.log('wiki diag', JSON.stringify(f.diag?.wikipedia || '').match(/[^,]*hockey[^,]*/gi));
  console.log('teamLinks hockey', JSON.stringify(Object.fromEntries(Object.entries(f.teamLinks || {}).filter(([k]) => k.startsWith('hockey')))).slice(0, 600));
  const ics = await (await fetch('https://kickoff.kiwi/data/cal/blacksticks.ics', { headers: UA })).text();
  console.log('blacksticks.ics', ics.length, (ics.match(/SUMMARY:.*/g) || []).slice(0, 4));
} catch (e) { console.log('live error', e.message); }
const pages = ['FIH World Rankings', "FIH Men's World Rankings", "FIH Women's World Rankings", "FIFA Men's World Ranking", "FIFA Women's World Ranking", 'ATP rankings', 'WTA rankings', 'List of current boxing rankings', 'The Ring pound for pound'];
for (const p of pages) {
  await new Promise(r => setTimeout(r, 1200));
  const j = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=parse&prop=text&redirects=1&page=' + encodeURIComponent(p), { headers: UA })).json();
  if (j.error) { console.log('\n#####', p, 'ERROR', j.error.code); continue; }
  const tables = tablesOf(j.parse.text);
  console.log('\n#####', p, '->', j.parse.title, tables.length, 'tables');
  const got = teamTables(tables, { sport: 'x', page: p, titles: ["Men's", "Women's"] });
  for (const l of got) console.log('  teamTables:', l.title, l.asOf, l.valLabel, l.rows.slice(0, 5).map(r => `${r.rank}. ${r.name} ${r.val}`).join(' | '), l.rows.find(r => r.nz) ? 'NZ ' + JSON.stringify(l.rows.find(r => r.nz)) : '');
  tables.slice(0, 8).forEach((t, i) => console.log(`  t${i} [${t.heading}] heads=${JSON.stringify(t.heads.slice(0, 2)).slice(0, 200)} rows=${t.rows.length} r0=${JSON.stringify(t.rows[0] || []).slice(0, 180)} notes=${t.notes.slice(-120)}`));
}
