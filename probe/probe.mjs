import { writeFileSync } from 'fs';
const out = [];
const wait = ms => new Promise(r => setTimeout(r, ms));
const get = async u => { for (let i = 0; i < 3; i++) { try { const r = await fetch(u); const t = await r.text(); if (t.trim().startsWith('{')) return JSON.parse(t); out.push('  retry ' + r.status); } catch (e) { out.push('  err ' + e.message); } await wait(20000); } return {}; };
const WANT = /ATP|WTA|PGA|SailGP|Sail GP|Nippon|NPB|Japan|Rugby Championship|WXV|Farah|Dean Jones|Formula 1|FIBA/i;
const save = async (h) => { if (!h) return; try { const r = await fetch(`https://r2.thesportsdb.com/images/media/league/badge/${h}.png/small`); const b = Buffer.from(await r.arrayBuffer()); if (r.ok && b.length > 500) writeFileSync(`probe/out-lg-${h}.png`, b); out.push(`  img ${h} ${r.status} ${b.length}`); } catch (e) { out.push('  img err ' + e.message); } };
const hash = u => u?.match(/badge\/([a-z0-9]+)\.png/)?.[1];
await save('g8cofl1513623681');
// competitions on the site still without a logo for the series page mock-ups (league badges, TheSportsDB)
for (const id of [4464, 4517, 4425, 4591, 4986, 4987, 4370]) {
  await wait(7000);
  const l = ((await get(`https://www.thesportsdb.com/api/v1/json/123/lookupleague.php?id=${id}`)).leagues || [])[0];
  out.push(`id ${id} ${l ? `${l.strLeague} | ${l.strSport} | ${l.strCountry} | badge ${hash(l.strBadge) || '-'}` : 'none'}`);
  if (l && WANT.test(l.strLeague + ' ' + (l.strLeagueAlternate || ''))) await save(hash(l.strBadge));
}
for (const [c, s] of [['Worldwide', 'Tennis'], ['Worldwide', 'Golf'], ['Australia', 'Golf'], ['Worldwide', 'Sailing'], ['International', 'Rugby'], ['Worldwide', 'Rugby'], ['Japan', 'Baseball'], ['Worldwide', 'Motorsport'], ['Worldwide', 'Basketball'], ['International', 'Basketball']]) {
  await wait(7000);
  const j = await get(`https://www.thesportsdb.com/api/v1/json/123/search_all_leagues.php?c=${encodeURIComponent(c)}&s=${encodeURIComponent(s)}`);
  const ls = j.countries || j.countrys || [];
  out.push(`${c} ${s}: ${ls.length}`);
  for (const l of ls) { out.push(`  ${l.idLeague} | ${l.strLeague} | ${l.strLeagueAlternate || ''} | badge ${hash(l.strBadge) || '-'}`); if (WANT.test(l.strLeague + ' ' + (l.strLeagueAlternate || ''))) await save(hash(l.strBadge)); }
}
writeFileSync('probe/out.txt', 'lg313\n' + out.join('\n') + '\n');
