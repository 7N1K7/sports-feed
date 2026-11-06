import { writeFileSync } from 'fs';
// daily check: do the A-League clubs' own Wikipedia season pages list round 5 to 7 games (a thin week flagged for 23 Nov)?
const out = [];
const clubs = ['Wellington Phoenix FC', 'Auckland FC', 'Melbourne City FC', 'Newcastle Jets FC', 'Sydney FC', 'Perth Glory FC', 'Brisbane Roar FC', 'Melbourne Victory FC', 'Adelaide United FC', 'Central Coast Mariners FC', 'Western Sydney Wanderers FC', 'Macarthur FC'];
for (const c of clubs) {
  const page = `2026–27 ${c} season`;
  const w = await (await fetch(`https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&formatversion=2&redirects=1`, { headers: { 'User-Agent': 'kickoff-kiwi-probe/1.0' } })).json().catch(e => ({ error: String(e) }));
  const t = w.parse?.wikitext || '';
  const boxes = [...t.matchAll(/\{\{\s*[Ff]ootball box( collapsible)?([\s\S]*?)\n\}\}/g)].map(m => m[2]);
  const al = boxes.filter(b => /A-League/i.test(b) || /round\s*=\s*\d/i.test(b));
  const pick = al.map(b => { const g = k => (b.match(new RegExp(`\\|\\s*${k}\\s*=\\s*([^\\n|]*)`)) || [])[1]?.trim() || ''; return `${g('round')} ${g('date').replace(/\{\{|\}\}/g, '').slice(0, 40)} ${g('time').slice(0, 30)} ${g('team1').replace(/\[\[|\]\]/g, '').slice(0, 30)} v ${g('team2').replace(/\[\[|\]\]/g, '').slice(0, 30)}`; });
  out.push(`${c}: ${t ? `${t.length} chars, ${boxes.length} boxes, ${al.length} league` : 'no page ' + (w.error?.info || w.error || '')}\n   ${pick.filter(x => /\b(5|6|7)\b/.test(x.split(' ')[0]) || /Round (5|6|7)/.test(x)).slice(0, 4).join('\n   ')}`);
  await new Promise(r => setTimeout(r, 400));
}
writeFileSync('probe/out.txt', 'daily1107c\n' + out.join('\n') + '\n');
