// probe 237: after v519: the WTA Finals card, the UFC Fight Night 293 headliners, the boxing cards' links, the hockey
// watch line, and the TV guide's Sky date
import fs from 'fs';
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json(), L = [`feed ${f.generatedAt}`];
L.push(`tvGuide: ${String(f.diag.tvGuide).slice(0, 160)}`, `fighterLinks: ${f.diag.fighterLinks}`, `boxing links gaps: ${JSON.stringify(f.coverage.boxing?.gaps?.links)}`, `mma gaps: ${JSON.stringify(f.coverage.mma?.gaps)}`);
for (const e of f.events.filter(e => /wta-finals-2026|tsdb-2601527/.test(e.id) || (e.sport === 'boxing' && e.status !== 'final') || e.team === 'blacksticks'))
  L.push(`${e.id} | ${e.home} v ${e.away} | ${e.startUTC} | ${e.city} ${e.tz} | ${e.broadcast || '-'} | card ${(e.card || []).map(b => `${b.a}${b.aLinks ? '+' : ''} v ${b.b}${b.bLinks ? '+' : ''}`).slice(0, 2).join('; ')}`);
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
