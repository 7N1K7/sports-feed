import { writeFileSync } from 'fs';
const out = [];
const IDS = [4416, 4551, 4328, 4387, 4424, 4443, 4356, 4434, 4538, 5278, 5530, 4714, 4574, 4986, 5113, 4429, 4446, 5069, 4401, 4352];
const get = async u => { for (let i = 0; i < 3; i++) { const r = await fetch(u); const t = await r.text(); if (t.trim().startsWith('{')) return JSON.parse(t); await new Promise(r => setTimeout(r, 15000)); } return {}; };
for (const id of IDS) {
  const l = ((await get(`https://www.thesportsdb.com/api/v1/json/123/lookupleague.php?id=${id}`)).leagues || [])[0];
  if (!l) { out.push(`${id}: none`); continue; }
  out.push(`${id} ${l.strLeague} (${l.strSport}) | ${l.strBadge ? 'badge' : '-'} | ${l.strLogo ? 'logo' : '-'}`);
  for (const [k, u] of [['b', l.strBadge], ['l', l.strLogo]]) if (u) { const r = await fetch(u + '/small'); if (r.ok) writeFileSync(`probe/out-lg-${id}-${k}.png`, Buffer.from(await r.arrayBuffer())); }
  await new Promise(r => setTimeout(r, 3000));
}
for (const [c, s] of [['New Zealand', 'Cricket'], ['Australia', 'Cricket'], ['Australia', 'Netball'], ['World', 'Rugby League']]) {
  const j = await get(`https://www.thesportsdb.com/api/v1/json/123/search_all_leagues.php?c=${encodeURIComponent(c)}&s=${encodeURIComponent(s)}`);
  for (const l of (j.countries || j.countrys || [])) {
    out.push(`${c}/${s}: ${l.idLeague} ${l.strLeague} | ${l.strBadge ? 'badge' : '-'} | ${l.strLogo ? 'logo' : '-'}`);
    if (/Plunket|Ford|Dean Jones|One-Day|Sheffield|Super Netball|WNCL|Womens National|Hallyburton|League World Cup|NRL/i.test(l.strLeague)) for (const [k, u] of [['b', l.strBadge], ['l', l.strLogo]]) if (u) { const r = await fetch(u + '/small'); if (r.ok) writeFileSync(`probe/out-lg-${l.idLeague}-${k}.png`, Buffer.from(await r.arrayBuffer())); }
  }
  await new Promise(r => setTimeout(r, 3000));
}
writeFileSync('probe/out.txt', 'lg295\n' + out.join('\n') + '\n');
