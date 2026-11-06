import { writeFileSync } from 'fs';
const out = [];
for (const id of [4551, 5174, 5278, 5701]) {
  try { await new Promise(r => setTimeout(r, 2500)); const j = await (await fetch(`https://www.thesportsdb.com/api/v1/json/123/lookupleague.php?id=${id}`)).json(); const l = j.leagues?.[0] || {}; out.push(`lookup ${id}: ${l.strLeague} | ${l.strSport} | ${l.strCountry} | ${l.strBadge}`); } catch (e) { out.push(`lookup err ${id} ${e.message}`); }
}
writeFileSync('probe/out.txt', 'badges302\n' + out.join('\n') + '\n');
