import { writeFileSync } from 'fs';
const out = [];
for (const t of ["2026 Women's Rugby League World Cup", "2026 Wheelchair Rugby League World Cup", "2026 Men's Rugby League World Cup Pools B & C"]) {
  const r = await fetch('https://en.wikipedia.org/w/index.php?action=raw&title=' + encodeURIComponent(t), { headers: { 'user-agent': 'kickoff.kiwi probe' } });
  const s = await r.text();
  out.push('=== ' + t + ' ' + s.length);
  const lines = s.split('\n');
  lines.forEach((l, i) => { if (/nowrap\|\s*\{\{|knockout|Semi-final|==\s*Final|^\{\{Rugby league box|^\|\s*(team1|team2|score|date)\s*=/i.test(l) && i > 0) out.push(i + ': ' + l.slice(0, 220).replace(/\b\d{1,3}\s*[–-]\s*\d{1,3}\b/g, '#–#')); });
}
writeFileSync('probe/out.txt', out.join('\n') + '\n');
