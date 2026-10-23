// probe 144: the new squad pages (NPC sides, rugby nations, India A, NZ women's cricket), read as the feed reads them
import { teamSquads } from './sources.mjs';
import { writeFile } from 'node:fs/promises';
const keys = ['Auckland', 'Bay of Plenty', 'Canterbury', 'Counties Manukau', "Hawke's Bay", 'Manawatu', 'North Harbour', 'Northland', 'Otago', 'Southland', 'Taranaki', 'Tasman', 'Waikato', 'Wellington', 'Tasman Mako', 'Taranaki Bulls',
  'Australia', 'Japan', 'Fiji', 'Samoa', 'Tonga', 'Georgia', 'United States', 'United States XV'].map(t => `rugby|m|${t}`)
  .concat(['cricket|m|India A'], ['Auckland Hearts', 'Central Hinds', 'Canterbury Magicians', 'Otago Sparks', 'Wellington Blaze', 'Northern Districts', 'Northern Brave'].map(t => `cricket|w|${t}`));
const diag = {}, out = await teamSquads(keys, diag);
const lines = [diag.teamSquads, ...out.map(s => `${s.sport}|${s.g}|${s.team}: ${s.players.length} · ${s.players.slice(0, 4).map(p => p.n + (p.r ? ` (${p.r})` : '')).join(', ')}`)];
await writeFile(new URL('./out.txt', import.meta.url), lines.join('\n') + '\n');
