// probe 213: the NPC final on the live feed after v496 (no score)
import fs from 'fs';
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
const L = [`feed ${f.generatedAt}`];
for (const e of f.events.filter(e => e.id === 'npc-final')) L.push(`${e.id} | ${e.home} v ${e.away} | ${e.startUTC} tbc=${e.timeTBC} | ${e.venue} / ${e.city} | status=${e.status} | logos ${!!e.homeLogo}/${!!e.awayLogo} | tv ${JSON.stringify(e.tv || e.broadcast || '')}`);
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
