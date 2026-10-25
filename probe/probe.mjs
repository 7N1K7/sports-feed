// probe 205: the live feed's NZ A v India A games: their squads (sides and how many players), no scores
import fs from 'fs';
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
const L = [`feed ${f.generatedAt}`];
for (const e of f.events) if (/India A/.test(`${e.home} ${e.away}`)) L.push(`${e.id} ${e.home} v ${e.away} ${e.startUTC} squads: ${(e.squads || []).map(s => `${s.team} ${s.players.length} (${s.players.slice(0, 3).map(p => p.n).join(', ')}…)`).join(' | ') || 'none'}`);
L.push('teamSquads India A: ' + (f.teamSquads || []).filter(s => /India A|New Zealand A/.test(s.team)).map(s => `${s.team} ${s.players?.length}`).join(', '));
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
