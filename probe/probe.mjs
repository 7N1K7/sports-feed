import { writeFileSync } from 'fs';
// daily check: the live feed's age and its checks (copied whole for reading)
const r = await fetch('https://kickoff.kiwi/data/feed.json?v=' + Date.now());
const t = await r.text(); writeFileSync('probe/out-feed.json', t);
const f = JSON.parse(t);
const age = Math.round((Date.now() - Date.parse(f.generatedAt)) / 60000);
writeFileSync('probe/out.txt', `daily1107\nstatus ${r.status} generatedAt ${f.generatedAt} (${age} min old) events ${(f.events || []).length}\nchecks ${JSON.stringify(f.checks || {}, null, 1).slice(0, 6000)}\n`);
