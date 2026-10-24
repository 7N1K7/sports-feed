import fs from 'fs';
const L = [];
const p = (...a) => L.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '));
const r = await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now(), { headers: { 'user-agent': 'KickoffKiwi probe' } });
const f = await r.json();
p('generatedAt', f.generatedAt, 'diag.f1:', f.diag?.f1, '| f1Times:', f.diag?.f1Times, '| supercarsTimes:', f.diag?.supercarsTimes);
for (const e of f.events.filter(e => e.sport === 'motor' && Date.parse(e.startUTC) > Date.now() - 2 * 864e5 && Date.parse(e.startUTC) < Date.now() + 10 * 864e5))
  p(e.id, e.session || '-', e.startUTC, e.status, e.minor ? 'minor' : '', e.comp);
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n'));
