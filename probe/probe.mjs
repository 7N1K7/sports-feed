// probe 107: ATP doubles rankings table rows (No. 2 missing), and the live feed after v381+
import { writeFileSync } from 'node:fs';
const UA = { 'User-Agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi; probe)' };
const W = 'https://en.wikipedia.org/w/api.php?format=json&formatversion=2&';
const atp = await (await fetch(W + 'action=parse&prop=text&redirects=1&page=ATP%20rankings', { headers: UA })).json();
const html = atp?.parse?.text || '';
for (const m of html.matchAll(/<table[^>]*wikitable[^>]*>([\s\S]*?)<\/table>/g)) {
  const rows = [...m[1].matchAll(/<tr[\s\S]*?<\/tr>/g)].map(r => r[0]);
  const head = rows.slice(0, 2).join(' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  if (!/doubles/i.test(head) || !/as of/i.test(head)) continue;
  console.log('TABLE head:', head.slice(0, 200));
  for (const r of rows.slice(0, 6)) console.log('  ROW', r.replace(/\s+/g, ' ').replace(/<a [^>]*>|<\/a>|<img[^>]*>|<span class="flagicon">[\s\S]*?<\/span>/g, '').slice(0, 600));
}
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
writeFileSync('probe/out-feed.json', JSON.stringify(f));
console.log('\ngenerated', f.generatedAt, 'version', f.site?.version, 'events', f.events?.length);
console.log('motorRankings:', f.diag?.motorRankings, '| wikiRetries:', f.diag?.wikiRetries);
console.log('NBL tables:', f.tables.filter(t => t.comp === 'NBL').map(t => `${t.style} ${t.rows.length}: ${t.rows.slice(0, 3).map(r => r.name + ' ' + r.w + '-' + r.l).join(', ')}`));
console.log('NBL events:', f.events.filter(e => e.comp?.startsWith('NBL')).length, 'teams:', JSON.stringify(f.diag?.eventsByTeam));
console.log('netball:', f.events.filter(e => e.sport === 'netball').map(e => `${e.startUTC} ${e.home} v ${e.away} ${e.status} ${e.comp}`).join(' ; '));
console.log('tsdb netball:', f.diag?.['tsdb Constellation Cup'], '|', f.diag?.['tsdb Taini Jamison Trophy']);
console.log('sailgp:', f.diag?.sailgp, '| golf:', JSON.stringify(f.diag?.golf));
console.log('sailing/golf events:', f.events.filter(e => e.sport === 'sailing' || e.sport === 'golf').map(e => `${e.startUTC.slice(0, 10)} ${e.team} ${e.home} ${e.status} ${e.broadcast || ''} ${(e.tv || []).map(x => x.ch).join('/')}`).join(' ; '));
console.log('FREE marks (tv free):', f.events.filter(e => (e.tv || []).some(x => !x.delayed && /^(TVNZ 1|TVNZ 2|Three|Sky Open|TVNZ DUKE)$/.test(x.ch))).map(e => `${e.home} v ${e.away}`).join(' ; '));
