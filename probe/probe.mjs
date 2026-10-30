// probe 230: the Constellation Cup cards in the live feed (status only) after v514
import fs from 'fs';
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json(), L = [`feed ${f.generatedAt}`, `tsdb: ${f.diag['tsdb Constellation Cup']}`];
for (const e of f.events.filter(e => e.team === 'silverferns')) L.push(`${e.id} ${e.status} score ${e.score ? 'set' : 'none'}`);
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
