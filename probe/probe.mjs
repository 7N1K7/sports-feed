// probe 226: the NZ v India T20I series' games in the live feed (status, start, score/summary shape) for the series line
import fs from 'fs';
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json(), L = [`feed ${f.generatedAt}`];
for (const e of f.events.filter(e => e.sport === 'cricket' && /India/.test(`${e.home} ${e.away}`) && /New Zealand|Black Caps/.test(`${e.home} ${e.away}`)).sort((a, b) => a.startUTC.localeCompare(b.startUTC)))
  L.push(`${e.id} | ${e.comp} | ${e.home} v ${e.away} | ${e.startUTC} | ${e.status} | score=${JSON.stringify(e.score || '')} | summary=${JSON.stringify((e.summary || '').slice(0, 80))} | src ${e.source?.slice(0, 60)}`);
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
