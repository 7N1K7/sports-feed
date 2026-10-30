// probe 232: after v515, the YouTube channels note and the In Australia line on RLWC games
import fs from 'fs';
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json(), L = [`feed ${f.generatedAt}`, `youtube: ${String(f.diag.youtube).slice(0, 400)}`];
const rl = f.events.filter(e => e.team === 'rlwc' || e.team === 'kiwis').filter(e => e.status !== 'final').slice(0, 4);
for (const e of rl) L.push(`${e.comp} | ${e.home} v ${e.away} | NZ ${e.broadcast} | AU ${e.watchAU || '-'}`);
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
