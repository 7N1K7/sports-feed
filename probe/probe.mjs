// probe 242: after v534: the live feed (UFC card times, Ford Trophy, WXV tables)
import fs from 'fs';
const L = [];
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
fs.writeFileSync(new URL('./out-feed.json', import.meta.url), JSON.stringify(f));
L.push(`feed ${f.generatedAt}`);
const now = Date.now();
for (const e of f.events.filter(e => (e.sport === 'mma' || /Ford Trophy|One-Day|Otago|Central/i.test(`${e.comp} ${e.home} ${e.away}`)) && Math.abs(Date.parse(e.startUTC) - now) < 4 * 864e5))
  L.push(`${e.id} | ${e.team} | ${e.comp} | ${e.home} v ${e.away} | ${e.startUTC} tbc ${e.timeTBC} | ${e.status} | minor ${!!e.minor} | ${e.source}`);
L.push('tables: ' + (f.tables || []).map(t => `${t.comp} [${t.page}] ${t.style || ''} ${t.rows?.length}`).filter(s => /WXV|Global/i.test(s)).join(' ; '));
L.push('diag keys with WXV/ford: ' + Object.entries(f.diag || {}).filter(([k, v]) => /wxv|ford|domestic/i.test(k + JSON.stringify(v))).map(([k, v]) => `${k}=${JSON.stringify(v).slice(0, 300)}`).join(' | '));
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
