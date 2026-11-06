import { writeFileSync } from 'fs';
const out = [];
const UA = { headers: { 'user-agent': 'kickoff-kiwi-probe/1.0 (https://kickoff.kiwi)' } };
// 1. what the live feed has for the Nations Championship (no scores printed)
try {
  const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now(), UA)).json();
  const nc = (f.events || f.games || []).filter(e => /Nations Championship/.test(e.comp || ''));
  out.push(`feed generated ${f.generated || f.updated || '?'}; NC events ${nc.length}`);
  for (const e of nc.sort((a, b) => String(a.startUTC).localeCompare(String(b.startUTC)))) out.push(`  ${e.startUTC} | ${e.home} v ${e.away} | ${e.status} | team=${e.team} | src=${e.src || e.source || ''} | id=${e.id}`);
  const keys = Object.keys(f); out.push('feed keys: ' + keys.join(','));
  const d = f.diag || f.diagnostics; if (d) out.push('diag NC: ' + JSON.stringify(Object.fromEntries(Object.entries(d).filter(([k]) => /Nations|wiki|rugby/i.test(k)))).slice(0, 1500));
} catch (e) { out.push('feed error ' + e.message); }
// 2. Wikipedia's page, as wikitext
try {
  const j = await (await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=2026_Nations_Championship&prop=wikitext&format=json&formatversion=2', UA)).json();
  const w = j.parse?.wikitext || ''; writeFileSync('probe/out-nc-wiki.txt', w); out.push(`wiki wikitext ${w.length} chars, rugbybox ${(w.match(/\{\{\s*rugbybox/gi) || []).length}`);
} catch (e) { out.push('wiki error ' + e.message); }
// 3. TheSportsDB's next and past events for the league
for (const u of ['eventsnextleague.php?id=5852', 'eventspastleague.php?id=5852', 'eventsseason.php?id=5852&s=2026']) {
  try { await new Promise(r => setTimeout(r, 2500)); const j = await (await fetch('https://www.thesportsdb.com/api/v1/json/123/' + u)).json();
    out.push(`tsdb ${u}: ${(j.events || []).length}`); for (const e of (j.events || [])) out.push(`  ${e.strTimestamp || e.dateEvent + ' ' + e.strTime} | ${e.strHomeTeam} v ${e.strAwayTeam} | r${e.intRound} | ${e.strStatus || ''}`);
  } catch (e) { out.push('tsdb error ' + u + ' ' + e.message); }
}
writeFileSync('probe/out.txt', 'nc303\n' + out.join('\n').replace(/key=[^&"\s]*/g, 'key=X') + '\n');
