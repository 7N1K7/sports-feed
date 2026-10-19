// probe 32: the new rankings lists (football, hockey, tennis) through the site's own code
import { RANK_PAGES, rankings } from './src/rankings.mjs';
const keep = RANK_PAGES.filter(p => /football|hockey|tennis/.test(p.sport));
RANK_PAGES.splice(0, RANK_PAGES.length, ...keep);
const diag = {};
const lists = await rankings({}, diag);
console.log('diag:', diag.rankings);
for (const l of lists) console.log(`\n${l.sport} | ${l.title} | asOf ${l.asOf} | ${l.valLabel} | ${l.rows.length} rows\n  ` + l.rows.map(r => `${r.rank}. ${r.name}${r.iso ? ' (' + r.iso + ')' : ''} ${r.val}${r.nz ? ' [NZ]' : ''}`).join('\n  '));
// where does the hockey page say when its table is from?
const UA = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi/; probe)' };
for (const p of ["FIH Men's World Ranking", "FIH Women's World Ranking"]) {
  const j = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=parse&prop=text&redirects=1&page=' + encodeURIComponent(p), { headers: UA })).json();
  const t = (j.parse?.text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  console.log('\n' + p, 'as-of mentions:', (t.match(/.{60}(?:as of|updated|last update)[^.]{0,60}/gi) || []).slice(0, 5));
}
