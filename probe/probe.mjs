// probe 210: the live feed after v490: which games have a free YouTube stream (no scores), and the YouTube diagnostics
import fs from 'fs';
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
const L = [`feed ${f.generatedAt}`, `diag: ${f.diag?.youtube || '-'}`];
for (const e of f.events) if (e.yt?.length) L.push(`${e.id} ${e.home} v ${e.away} ${e.startUTC} | ${e.yt.map(y => `${y.ch} ${y.state} ${y.url}`).join(' ; ')}`);
for (const e of f.events) if (/Pakistan|England|Sri Lanka/.test(`${e.home} ${e.away}`) && e.sport === 'cricket' && Math.abs(Date.parse(e.startUTC) - Date.now()) < 3 * 864e5) L.push(`tri? ${e.id} ${e.home} v ${e.away} ${e.startUTC} yt ${(e.yt || []).length}`);
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
