// probe 218: the live feed after v501: Supercars race results and the F1 back-fill (counts and sources, no results)
import fs from 'fs';
const L = [];
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
L.push(`generated ${f.generatedAt}; supercarsResults: ${f.diag?.supercarsResults}; f1Past: ${f.diag?.f1Past}; seen ${JSON.stringify(f.diag?.supercarsResultsSeen)}`);
for (const e of f.events.filter(e => /^(f1|supercars)-2026-\d+$/.test(e.id) && Date.parse(e.startUTC) < Date.now()))
  L.push(`${e.id} ${e.home} ${e.status} raceNos=${(e.raceNos || []).join('/')} cls=${e.cls?.length || 0} raceRes=${(e.raceRes || []).map(r => `${r.n}:${r.rows.length}(${r.src}, kiwis ${r.rows.filter(x => x.nz).length})`).join(' ') || '-'}`);
const h = await (await fetch('https://kickoff.kiwi/?x=' + Date.now())).text();
L.push(`site has raceBoards: ${h.includes('const raceBoards')}; drv css: ${h.includes('.rboard .drv')}`);
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
