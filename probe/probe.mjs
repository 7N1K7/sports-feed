import { writeFileSync } from 'fs';
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
const now = Date.now(), out = [];
const win = f.events.filter(e => { const t = Date.parse(e.startUTC) - now; return t > -86400e3 && t < 21 * 86400e3 && e.status !== 'final'; });
for (const e of win.filter(e => e.timeTBC || !(e.broadcast && e.broadcast !== 'TBC' || e.watchAlt || e.yt || e.tv))) out.push(`TBC ${e.startUTC} ${e.sport} | ${e.comp} | ${e.home} v ${e.away} | t${e.timeTBC ? 'TBC' : ''} | ${e.broadcast || '-'} | ${e.watchAlt || ''} | ${(e.source || '').slice(0, 70)}`);
const by = {}; for (const e of win) (by[e.team || e.sport] ||= []).push(e.startUTC.slice(5, 10));
out.push('', ...Object.entries(by).map(([k, v]) => `${k}: ${v.length} (${v.slice(0, 6).join(' ')})`));
writeFileSync('probe/out.txt', out.join('\n') + '\n');
