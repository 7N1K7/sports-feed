// probe 234: a sweep of the live feed: coverage gaps per sport, sources reporting errors or nothing, and upcoming games missing a time or watch line
import fs from 'fs';
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json(), L = [`feed ${f.generatedAt} events ${f.events.length}`];
L.push('coverage:'); for (const [sp, c] of Object.entries(f.coverage || {})) L.push(`${sp}: ${JSON.stringify(c).slice(0, 300)}`);
L.push('diag with error/0/none:'); for (const [k, v] of Object.entries(f.diag || {})) if (/error|fail|\b0\b|none|no key|timeout|\b4\d\d\b|\b5\d\d\b/i.test(String(v))) L.push(`${k}: ${String(v).slice(0, 160)}`);
const now = Date.now(), up = f.events.filter(e => e.status !== 'final' && Date.parse(e.startUTC) > now && Date.parse(e.startUTC) < now + 21 * 864e5);
L.push(`next 3 weeks: ${up.length}`);
L.push('no watch line:'); for (const e of up.filter(e => !e.broadcast && !e.watchNote && !e.watchAlt).slice(0, 25)) L.push(`${e.sport} | ${e.comp} | ${e.home || e.name} v ${e.away || ''} | ${e.startUTC}`);
L.push('time TBC:'); for (const e of up.filter(e => e.tbc || e.timeTBC).slice(0, 15)) L.push(`${e.sport} | ${e.comp} | ${e.home || e.name} v ${e.away || ''} | ${e.startUTC}`);
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
