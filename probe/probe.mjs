import { writeFileSync } from 'fs';
const out = [];
const L = { 5587: 'r7gr431740091965', 5806: 'sxoc6h1768739073', 4574: '1otaxh1773613283', 4985: 'egbkvq1716567039', 4549: 'x45gjq1764423537' };
for (const [id, b] of Object.entries(L)) {
  try { const r = await fetch(`https://r2.thesportsdb.com/images/media/league/badge/${b}.png/small`); const buf = Buffer.from(await r.arrayBuffer()); writeFileSync(`probe/out-lg-${id}.png`, buf); out.push(`${r.status} ${buf.length}B lg-${id}`); } catch (e) { out.push(`err ${id} ${e.message}`); }
}
for (const id of [4985, 4549]) {
  try { await new Promise(r => setTimeout(r, 2500)); const j = await (await fetch(`https://www.thesportsdb.com/api/v1/json/123/lookupleague.php?id=${id}`)).json(); const l = j.leagues?.[0] || {}; out.push(`lookup ${id}: ${l.strLeague} | ${l.strSport} | ${l.strBadge}`); } catch (e) { out.push(`lookup err ${id} ${e.message}`); }
}
writeFileSync('probe/out.txt', 'badges301\n' + out.join('\n') + '\n');
