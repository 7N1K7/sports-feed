// probe 223: the Supercars results log in the live feed (sources and when each race's order first turned up)
import fs from 'fs';
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
fs.writeFileSync(new URL('./out.txt', import.meta.url), `feed ${f.generatedAt}\n${f.diag?.supercarsResults}\n${JSON.stringify(f.diag?.supercarsResultsSeen)}\nf1Past: ${f.diag?.f1Past || '-'}\n`);
