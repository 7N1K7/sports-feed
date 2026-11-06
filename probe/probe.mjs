import { writeFileSync } from 'fs';
const out = [];
for (const [c, s] of [['Australia', 'Cricket'], ['World', 'Rugby'], ['World', 'Rugby League'], ['New Zealand', 'Cricket']]) {
  const j = await (await fetch(`https://www.thesportsdb.com/api/v1/json/123/search_all_leagues.php?c=${encodeURIComponent(c)}&s=${encodeURIComponent(s)}`)).json();
  for (const l of (j.countries || j.countrys || [])) { out.push(`${l.idLeague} ${l.strLeague} | badge ${l.strBadge || '-'}`); if (l.strBadge && /Big Bash|World Cup|Nations|Ford|Smash/i.test(l.strLeague)) { const r = await fetch(l.strBadge + '/small'); if (r.ok) writeFileSync(`probe/out-lg-${l.idLeague}.png`, Buffer.from(await r.arrayBuffer())); } }
  await new Promise(r => setTimeout(r, 1500));
}
writeFileSync('probe/out.txt', 'leagues2\n' + out.join('\n') + '\n');
