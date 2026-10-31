// probe 240: after v522: the TV guide's reach per source and what it lists for the next week's games
import fs from 'fs';
const L = [];
let f; for (let i = 0; i < 40; i++) { f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json(); if (/SkySportNow/.test(f.diag.tvGuide || '')) break; await new Promise(r => setTimeout(r, 30e3)); }
L.push(`feed ${f.generatedAt}`, `tvGuide: ${String(f.diag.tvGuide).slice(0, 1400)}`, `missing: ${f.diag.tvGuideMissing || '-'}`);
const now = Date.now();
for (const e of f.events.filter(e => e.status !== 'final' && Date.parse(e.startUTC) > now - 864e5 && Date.parse(e.startUTC) < now + 7 * 864e5 && (e.sport === 'cricket' || e.sport === 'tennis')))
  L.push(`${e.comp} | ${e.home} v ${e.away || ''} | ${e.startUTC} | ${e.broadcast || '-'} | tv ${(e.tv || []).map(x => x.ch + (x.delayed ? '(d)' : '')).join(', ') || '-'}`);
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
