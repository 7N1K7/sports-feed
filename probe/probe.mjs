import fs from 'fs';
const out = [];
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
fs.writeFileSync(new URL('./feed.json', import.meta.url), JSON.stringify(f));
for (const e of f.events.filter(e => /Japan/.test(e.home + e.away) && /Wales/.test(e.home + e.away))) out.push(JSON.stringify(Object.fromEntries(Object.entries(e).filter(([k]) => !/squads|leaders|card/.test(k)))));
const d = f.diag || {}; out.push(Object.keys(d).join(', '));
for (const k of Object.keys(d).filter(k => /wxv|tsdb|rugby/i.test(k))) out.push(`diag ${k}: ${JSON.stringify(d[k]).slice(0, 600)}`);
fs.writeFileSync(new URL('./out.txt', import.meta.url), out.join('\n'));
