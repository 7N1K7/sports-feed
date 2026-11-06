import { writeFileSync } from 'fs';
const out = [];
// the NBA's league badge on TheSportsDB, for its series page
for (const id of [4387]) {
  try { const j = await (await fetch(`https://www.thesportsdb.com/api/v1/json/123/lookupleague.php?id=${id}`)).json(); const l = j.leagues?.[0]; out.push(`${id} ${l?.strLeague} badge ${l?.strBadge?.match(/badge\/([a-z0-9]+)\.png/)?.[1]}`); } catch (e) { out.push(id + ' error ' + e.message); }
}
writeFileSync('probe/out.txt', 'lg314\n' + out.join('\n') + '\n');
