import { writeFileSync } from 'fs';
const out = [];
const all = (await (await fetch('https://www.thesportsdb.com/api/v1/json/123/all_leagues.php')).json()).leagues || [];
const want = all.filter(l => /Big Bash|Rugby League World Cup|Nations Championship|Ford Trophy|Super Smash/i.test(l.strLeague));
for (const l of want) {
  const d = (await (await fetch(`https://www.thesportsdb.com/api/v1/json/123/lookupleague.php?id=${l.idLeague}`)).json()).leagues?.[0] || {};
  out.push(`${l.idLeague} ${l.strLeague} | ${l.strSport} | badge ${d.strBadge || '-'} | logo ${d.strLogo || '-'}`);
  if (d.strBadge) { const r = await fetch(d.strBadge + '/small'); if (r.ok) writeFileSync(`probe/out-lg-${l.idLeague}.png`, Buffer.from(await r.arrayBuffer())); }
  await new Promise(r => setTimeout(r, 1200));
}
writeFileSync('probe/out.txt', 'leagues\n' + out.join('\n') + '\n');
