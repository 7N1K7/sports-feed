// probe 229: Constellation Cup in TheSportsDB (league 5793) and on Wikipedia's Constellation Cup page
import fs from 'fs';
const L = [], UA = { 'User-Agent': 'kickoff.kiwi probe' };
for (const u of ['eventsseason.php?id=5793&s=2026', 'eventspastleague.php?id=5793', 'eventsnextleague.php?id=5793']) {
  const j = await (await fetch(`https://www.thesportsdb.com/api/v1/json/123/${u}`)).json().catch(e => ({ err: String(e) }));
  const ev = j.events || j.results || [];
  L.push(`== ${u}: ${ev.length}`); for (const e of ev) L.push(`${e.dateEvent} ${e.strTime} r${e.intRound} ${e.strEvent} | ${e.intHomeScore ?? ''}-${e.intAwayScore ?? ''} | ${e.strStatus} | ${e.strVenue}`);
}
const r = await fetch('https://en.wikipedia.org/w/api.php?action=parse&format=json&prop=wikitext&redirects=1&page=Constellation_Cup', { headers: UA }); const w = (await r.json()).parse?.wikitext?.['*'] || '';
const i = w.search(/2026/); L.push(`== Wikipedia Constellation Cup (${w.length}), around 2026:`); L.push(w.slice(Math.max(0, i - 200), i + 2500));
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
