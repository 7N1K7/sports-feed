// probe 146: what TheSportsDB's free key gives for past results: a whole season, a team's last games
import { writeFile } from 'node:fs/promises';
const T = 'https://www.thesportsdb.com/api/v1/json/123/', UA = { headers: { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' } };
const lines = [], sleep = ms => new Promise(r => setTimeout(r, ms));
const get = async q => { const r = await fetch(T + q, UA); await sleep(6500); if (!r.ok) return { err: r.status }; try { return await r.json(); } catch { return { err: 'not json' }; } };
const sum = (q, j) => { const ev = j.events || j.results || []; lines.push(`${q}: ${j.err || ''} ${Array.isArray(ev) ? ev.length : typeof ev} events` + (Array.isArray(ev) && ev.length ? ` · first ${ev[0].dateEvent} ${ev[0].strEvent} r${ev[0].intRound} · last ${ev.at(-1).dateEvent} ${ev.at(-1).strEvent} r${ev.at(-1).intRound} ${ev.at(-1).intHomeScore}-${ev.at(-1).intAwayScore}` : '')); return ev; };
for (const q of ['eventsseason.php?id=4328&s=2026-2027', 'eventsseason.php?id=4356&s=2025-2026', 'eventsseason.php?id=5806&s=2026', 'eventslast.php?id=133604'])
  sum(q, await get(q));
// national sides: find a team id, then its last games
for (const t of ['Tonga Rugby League', 'New Zealand Rugby League', 'Lebanon Rugby League']) {
  const j = await get('searchteams.php?t=' + encodeURIComponent(t)), tm = (j.teams || [])[0];
  lines.push(`team ${t}: ${tm ? tm.idTeam + ' ' + tm.strTeam + ' ' + tm.strLeague : 'none'}`);
  if (tm) { sum('eventslast.php?id=' + tm.idTeam, await get('eventslast.php?id=' + tm.idTeam)); }
}
await writeFile(new URL('./out.txt', import.meta.url), lines.join('\n') + '\n');
