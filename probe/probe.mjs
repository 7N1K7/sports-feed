// probe 100: tennis lists with the doubles teams
import { rankings } from './rankings.mjs';
const r = await rankings({}, {});
for (const l of r.filter(l => l.sport === 'tennis')) console.log(`${l.title} (${l.asOf}) ${l.rows.length}: ${l.rows.slice(0, 3).map(x => `${x.rank} ${x.name} ${x.pair ? x.pair.map(p => p.iso).join('/') : x.iso} ${x.val}`).join(' | ')}`);
console.log(JSON.stringify(r.find(l => /teams/.test(l.title))?.rows[0]));
