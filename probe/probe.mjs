// probe 78: the new team squad reader on every listed page
import { teamSquads, TEAM_PAGES } from './sources.mjs';
const diag = {};
const out = await teamSquads(Object.keys(TEAM_PAGES), diag);
console.log(diag.teamSquads);
for (const s of out) console.log(`${s.sport}|${s.g}|${s.team}: ${s.players.length} | ${s.players.slice(0, 5).map(p => p.n + (p.r ? ` [${p.r}]` : '') + (p.w ? ` {${p.w}}` : '')).join('; ')}`);
