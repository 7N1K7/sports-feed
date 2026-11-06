import { writeFileSync } from 'fs';
const out = [];
// competition badges from TheSportsDB's image store, for the series page mock-ups
for (const h of ['cd4akv1742154549', '0rbyp71786623355', 'gasy9d1737743125', 'g5ocbs1777721333', '2u78lm1638459575', 'bewnz31717531281', 'gvz6vb1726086476', '64f67s1770108650', '6edvvh1767868334', 'yko7ny1546635346']) {
  try { const r = await fetch(`https://r2.thesportsdb.com/images/media/league/badge/${h}.png/small`); const b = Buffer.from(await r.arrayBuffer());
    if (r.ok && b.length > 500) { writeFileSync(`probe/out-lg-${h}.png`, b); out.push(`${h} ${b.length}`); } else out.push(`${h} ${r.status} ${b.length}`); } catch (e) { out.push(h + ' error ' + e.message); }
}
// Formula 1's league
try { await new Promise(r => setTimeout(r, 3000)); const j = await (await fetch('https://www.thesportsdb.com/api/v1/json/123/lookupleague.php?id=4370')).json(); const l = j.leagues?.[0]; out.push(`F1 ${l?.strLeague} badge ${l?.strBadge}`); } catch (e) { out.push('f1 error ' + e.message); }
writeFileSync('probe/out.txt', 'lg312\n' + out.join('\n') + '\n');
