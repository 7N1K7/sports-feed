// probe 35: save the live feed for timing the page locally
import { writeFileSync } from 'node:fs';
const r = await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now(), { headers: { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi/; probe)' } });
const t = await r.text();
writeFileSync(new URL('./out-feed.json', import.meta.url), t);
const f = JSON.parse(t);
console.log('version', f.site?.version, 'events', f.events.length, 'news', (f.news || []).length, 'bytes', t.length);
