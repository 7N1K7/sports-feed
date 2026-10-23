import fs from 'fs';
const out = [];
const j = async u => { try { const r = await fetch(u, { headers: { 'user-agent': 'KickoffKiwi/1.0' } }); return await r.json(); } catch (e) { return { err: e.message }; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const B = 'https://www.thesportsdb.com/api/v1/json/123/';
const all = await j(B + 'search_all_leagues.php?c=Australia&s=Basketball'); await sleep(2100);
out.push('leagues: ' + JSON.stringify((all.countries || all.countrys || []).map(l => [l.idLeague, l.strLeague, l.strCurrentSeason])));
const id = (all.countries || all.countrys || []).find(l => /NBL$|National Basketball League/.test(l.strLeague))?.idLeague || '4434';
const nx = await j(B + `eventsnextleague.php?id=${id}`); await sleep(2100);
out.push('next: ' + (nx.events || []).slice(0, 6).map(e => `${e.dateEvent} ${e.strTime} ${e.strTimestamp} ${e.strHomeTeam} v ${e.strAwayTeam} R${e.intRound} @${e.strVenue}`).join('\n  '));
for (const s of ['2026-2027', '2026']) { const d = await j(B + `eventsseason.php?id=${id}&s=${s}`); await sleep(2100); out.push(`season ${s}: ${(d.events || []).length} ` + (d.events || []).slice(0, 3).map(e => `${e.dateEvent} ${e.strTime} ${e.strHomeTeam} v ${e.strAwayTeam} R${e.intRound}`).join('; ')); }
for (const r of [6, 7, 12]) { const d = await j(B + `eventsround.php?id=${id}&r=${r}&s=2026-2027`); await sleep(2100); out.push(`round ${r}: ${(d.events || []).length} ` + (d.events || []).slice(0, 5).map(e => `${e.dateEvent} ${e.strTime} ${e.strHomeTeam} v ${e.strAwayTeam} @${e.strVenue}`).join('; ')); }
fs.writeFileSync(new URL('./out.txt', import.meta.url), out.join('\n'));
