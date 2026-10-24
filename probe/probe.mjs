import fs from 'fs';
const out = [];
const j = async u => { try { const r = await fetch(u, { headers: { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi)' } }); return await r.json(); } catch (e) { return { err: e.message }; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const B = 'https://www.thesportsdb.com/api/v1/json/123/';
const all = await j(B + 'all_leagues.php'); await sleep(2100);
const lg = (all.leagues || []).filter(l => /rugby/i.test(l.strSport) && /WXV|women/i.test(l.strLeague));
out.push('leagues: ' + JSON.stringify(lg.map(l => [l.idLeague, l.strLeague])));
for (const l of lg.slice(0, 3)) {
  const nx = await j(B + `eventsnextleague.php?id=${l.idLeague}`); await sleep(2100);
  out.push(`${l.strLeague} next: ` + (nx.events || []).slice(0, 3).map(e => `${e.strTimestamp} ${e.strHomeTeam} v ${e.strAwayTeam} R${e.intRound} s${e.strSeason}`).join('; '));
}
const day = await j(B + 'eventsday.php?d=2026-10-24&s=Rugby%20Union'); await sleep(2100);
out.push('day: ' + (day.events || []).map(e => `${e.strTimestamp} ${e.strHomeTeam} v ${e.strAwayTeam} [${e.strLeague} ${e.idLeague}]`).join('; '));
const s = await j(B + 'searchevents.php?e=Japan_vs_Wales'); await sleep(2100);
out.push('search: ' + (s.event || []).slice(-6).map(e => `${e.strTimestamp} ${e.strEvent} [${e.strLeague} ${e.idLeague}]`).join('; '));
// Wikipedia's box for the game
const w = await j('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&titles=2026_WXV_Global_Series');
const t = w.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content || '';
const i = t.search(/Chichibunomiya/);
out.push('wiki box: ' + t.slice(Math.max(0, i - 900), i + 200));
fs.writeFileSync(new URL('./out.txt', import.meta.url), out.join('\n'));
