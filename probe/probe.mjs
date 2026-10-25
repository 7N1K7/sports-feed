// probe 195: the live site after v473: the US games' names, the NZ A watch line, and the new code on the page
import fs from 'fs';
const L = [];
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
for (const e of (f.events || []).filter(x => /unitedstates/.test(x.id))) L.push(`${e.id}: ${e.home} v ${e.away} team=${e.team} start=${e.startUTC} b=${e.broadcast || '-'}`);
for (const e of (f.events || []).filter(x => /^nza-inda/.test(x.id))) L.push(`${e.id}: alt=${e.watchAlt} note=${e.watchNote || '-'}`);
const h = await (await fetch('https://kickoff.kiwi/?x=' + Date.now())).text();
L.push('page has splitWatch=' + h.includes('splitWatch') + ' tvt=' + h.includes('class="tvt"') + ' lcw=' + h.includes('--lcw') + ' tvnz sport=' + h.includes('tvnz.co.nz/sport') + ' 3px ends=' + h.includes('border-width: 2px 3px'));
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
