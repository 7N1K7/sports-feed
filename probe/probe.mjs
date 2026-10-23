// probe 145: the live coverage detail file and the new squads in the live feed
import { writeFile } from 'node:fs/promises';
const get = async u => (await fetch(u + '?t=' + Date.now())).json();
const det = await get('https://kickoff.kiwi/data/coverage-detail.json'), f = await get('https://kickoff.kiwi/data/feed.json');
const lines = [`detail v${det.v} at ${det.at}: ${det.games.length} games, ${det.sides.length} sides, ${JSON.stringify(det).length} bytes`, `feed v${f.site?.version} at ${f.generatedAt}`,
  'teamSquads: ' + f.diag?.teamSquads];
for (const [k, c] of Object.entries(f.coverage)) lines.push(`${k}: games ${c.games} time ${c.time} watch ${c.watch} squads ${c.squads}/${c.sqGames} pic ${c.pic}/${c.sides} links ${c.links} | detail squads ${det.games.filter(g => g.s === k && g.f & 8).length}/${det.games.filter(g => g.s === k && g.f & 4).length} time ${det.games.filter(g => g.s === k && g.f & 1).length}`);
lines.push('squad gaps: ' + JSON.stringify(Object.fromEntries(Object.entries(f.coverage).map(([k, c]) => [k, c.gaps.squads]))));
lines.push('sample games: ' + JSON.stringify(det.games.slice(0, 3)), 'sample sides: ' + JSON.stringify(det.sides.slice(0, 3)));
await writeFile(new URL('./out.txt', import.meta.url), lines.join('\n') + '\n');
