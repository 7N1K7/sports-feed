// probe 224: TheSportsDB Supercars races with 34 result lines (round 6 race 19, round 2 race 7): what the extra lines are
import fs from 'fs';
const ua = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi) probe' }, L = [];
for (const r of [6, 2, 5]) {
  const d = await (await fetch(`https://www.thesportsdb.com/api/v1/json/123/eventsround.php?id=4489&r=${r}&s=2026`, { headers: ua })).json();
  for (const ev of (d.events || []).filter(ev => /Race \d+\s*$/.test(ev.strEvent) && !/Qualifying|Shootout/i.test(ev.strEvent))) {
    const lines = String(ev.strResult || '').split(/\r?\n/);
    L.push(`r${r} ${ev.strEvent}: ${lines.length} lines; numbered ${lines.filter(l => /^\s*\d+\t/.test(l)).length}`);
    if (lines.length > 26) L.push(lines.map((l, i) => `   ${i}: ${JSON.stringify(l.slice(0, 90))}`).join('\n'));
  }
  await new Promise(r => setTimeout(r, 3000));
}
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
