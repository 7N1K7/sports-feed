// probe 48: the cricket rankings through the fixed parser (footer rows dropped; women's ODI and T20I from their own sections)
import { rankings, RANK_PAGES } from './src/rankings.mjs';
RANK_PAGES.splice(0, RANK_PAGES.length, ...RANK_PAGES.filter(p => p.sport === 'cricket'));
const diag = {}, lists = await rankings({}, diag);
console.log(diag.rankings);
for (const l of lists) console.log(`\n${l.title} (${l.asOf}, ${l.valLabel}): ${l.rows.length} rows\n  ` + l.rows.map(r => `${r.rank}. ${r.name} ${r.val}${r.nz ? ' (NZ)' : ''}`).join(' | '));
