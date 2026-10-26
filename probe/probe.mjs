// probe 212: the NPC final as the live feed has it (no score), and which live source matched it: TheSportsDB's NPC
// games around now, as listed (home/away order, venue, time)
import fs from 'fs';
const ua = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi) probe' }, L = [];
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
L.push(`feed ${f.generatedAt}`);
for (const e of f.events.filter(e => e.team === 'npc' && Date.parse(e.startUTC) > Date.now() - 4 * 864e5))
  L.push(`${e.id} | ${e.home} v ${e.away} | ${e.startUTC} tbc=${e.timeTBC} | ${e.venue} / ${e.city} | status=${e.status} | src=${e.source} | link=${e.link || '-'} | logos ${!!e.homeLogo}/${!!e.awayLogo}`);
for (const k of Object.keys(f.diag || {})) { const v = JSON.stringify(f.diag[k]); if (/npc|NPC|Northland|Canterbury/.test(v)) L.push(`diag.${k}: ${v.replace(/\d+-\d+/g, 'N-N').slice(0, 600)}`); }
for (const id of [4485, 5069]) try {
  const d = await (await fetch(`https://www.thesportsdb.com/api/v1/json/123/eventsnextleague.php?id=${id}`, { headers: ua })).json();
  const p = await (await fetch(`https://www.thesportsdb.com/api/v1/json/123/eventspastleague.php?id=${id}`, { headers: ua })).json();
  for (const e of [...(d.events || []), ...(p.events || [])]) L.push(`tsdb ${id} ${e.strLeague}: ${e.strHomeTeam} v ${e.strAwayTeam} | ${e.strTimestamp} | ${e.strVenue} | ${e.strStatus}`);
} catch (e) { L.push(`tsdb ${id}: ${e.message}`); }
const s = await (await fetch('https://www.thesportsdb.com/api/v1/json/123/searchevents.php?e=Canterbury_vs_Northland', { headers: ua })).json();
for (const e of s.event || []) L.push(`search: ${e.strEvent} | ${e.strLeague} | ${e.strTimestamp} | ${e.strVenue}`);
const s2 = await (await fetch('https://www.thesportsdb.com/api/v1/json/123/searchevents.php?e=Northland_vs_Canterbury', { headers: ua })).json();
for (const e of s2.event || []) L.push(`search2: ${e.strEvent} | ${e.strLeague} | ${e.strTimestamp} | ${e.strVenue}`);
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
