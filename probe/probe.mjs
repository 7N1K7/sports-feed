// probe 246: after v538: Test innings, SA v AUS 1st Test kept, checks
import fs from 'fs';
const L = [];
let f; for (let i = 0; i < 30; i++) { f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json(); if (f.checks) break; await new Promise(r => setTimeout(r, 30e3)); }
fs.writeFileSync(new URL('./out-feed.json', import.meta.url), JSON.stringify(f));
L.push(`feed ${f.generatedAt} checks: ${f.diag.checks}`);
for (const e of f.events.filter(e => e.sport === 'cricket' && /Test/.test(`${e.stage} ${e.format}`) && e.status === 'final'))
  L.push(`${e.comp} | ${e.stage} | ${e.startUTC} | score has innings: ${/&| v /.test(e.score || '')} | score==summary: ${e.score === e.summary}`);
for (const e of f.events.filter(e => /Otago Volts v|Moicano/.test(`${e.home} v ${e.away}`))) L.push(`${e.home} v ${e.away} | ${e.startUTC} | ${e.status} | tbc ${e.timeTBC}`);
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
