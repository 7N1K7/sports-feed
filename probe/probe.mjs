// probe 133: the wheelchair World Cup squads read from the tournament page, and every side's squad again
import { teamSquads, TEAM_PAGES } from './sources.mjs';
const diag = {};
const out = await teamSquads(Object.keys(TEAM_PAGES), diag);
console.log('teamSquads:', diag.teamSquads);
for (const s of out.filter(s => s.g === 'wc')) console.log(s.team, s.players.length, JSON.stringify(s.players.slice(0, 4)));
