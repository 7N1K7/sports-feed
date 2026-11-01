// probe 251: the time notes on the 2026-27 Big Bash League page, and its Perth, Brisbane and India games' times (no results)
import fs from 'fs';
const L = [];
const w = (await (await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=' + encodeURIComponent('2026–27 Big Bash League season') + '&prop=wikitext&format=json&formatversion=2', { headers: { 'user-agent': 'kickoff.kiwi probe' } })).json()).parse?.wikitext || '';
L.push('length ' + w.length);
for (const m of w.matchAll(/[^\n]*All[^\n]{0,30}times[^\n]*/gi)) L.push('NOTE @' + m.index + ': ' + m[0].slice(0, 300));
for (const m of w.matchAll(/==[^\n]+==/g)) L.push('HEAD @' + m.index + ': ' + m[0]);
const boxes = [...w.matchAll(/\{\{\s*Single-innings cricket match[\s\S]*?\n\}\}/gi)];
for (const b of boxes.slice(0, 40)) {
  const t = b[0]; if (!/Perth|Brisbane|India|Adelaide|Indore|Delhi|Mumbai|Ahmedabad/i.test(t)) continue;
  const g = k => (t.match(new RegExp('\\|\\s*' + k + '\\s*=([^\\n]*)')) || [])[1]?.trim();
  L.push(`@${b.index} ${g('date')} ${g('time')} | ${g('team1')?.replace(/\[\[[^|\]]*\|/g, '').replace(/[\[\]]/g, '')} v ${g('team2')?.replace(/\[\[[^|\]]*\|/g, '').replace(/[\[\]]/g, '')} | ${g('venue')?.replace(/[\[\]]/g, '')}`);
}
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
