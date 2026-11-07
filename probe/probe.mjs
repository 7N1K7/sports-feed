import { writeFileSync } from 'fs';
// NBL tip-off times: what Wikipedia's season page and TheSportsDB each say for 7 to 15 Nov (no scores)
const out = [];
const UA = { headers: { 'User-Agent': 'kickoff-kiwi-probe/1.0' } };
const j = await (await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=2026%E2%80%9327_NBL_season&prop=wikitext&format=json&formatversion=2&redirects=1', UA)).json();
const t = j.parse?.wikitext || '';
out.push('wiki chars ' + t.length);
const tzNotes = [...t.matchAll(/[^\n]{0,80}(AEDT|AEST|ACDT|local time|All times)[^\n]{0,80}/g)].slice(0, 6).map(m => '  note: ' + m[0].replace(/\s+/g, ' ').slice(0, 170));
out.push(...tzNotes);
const boxes = [...t.matchAll(/\{\{\s*(Basketballbox[^|\n]*|basketballbox[^|\n]*|Basketball box[^|\n]*)([\s\S]*?)\n\}\}/g)];
out.push('boxes ' + boxes.length + ' templates ' + [...new Set(boxes.map(b => b[1].trim()))].join(','));
for (const b of boxes) { const x = b[2]; const g = k => ((x.match(new RegExp(`\\|\\s*${k}\\s*=\\s*([^\\n]*)`)) || [])[1] || '').trim();
  const d = g('date'); if (!/\b([7-9]|1[0-5]) November 2026|November ([7-9]|1[0-5]), 2026/.test(d)) continue;
  out.push(`  ${d.slice(0, 40)} | ${g('time').slice(0, 60)} | ${g('teamA').slice(0, 30)} v ${g('teamB').slice(0, 30)} | ${g('place').slice(0, 40)}`); }
// TheSportsDB
for (const r of [5, 6, 7, 8, 9]) {
  const d = await (await fetch(`https://www.thesportsdb.com/api/v1/json/123/eventsround.php?id=4434&r=${r}&s=2026-2027`)).json().catch(() => ({}));
  for (const e of d.events || []) if (/2026-11-(0[6-9]|1[0-5])/.test(e.dateEvent || '')) out.push(`  tsdb r${r} ${e.strEvent} | ts ${e.strTimestamp} | date ${e.dateEvent} time ${e.strTime} | local ${e.dateEventLocal} ${e.strTimeLocal}`);
  await new Promise(r => setTimeout(r, 7000));
}
writeFileSync('probe/out.txt', 'nbltimes\n' + out.join('\n') + '\n');
