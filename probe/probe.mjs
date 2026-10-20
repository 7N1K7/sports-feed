// probe 51: copy of the live feed for local layout tests
import { writeFileSync } from 'fs';
const r = await fetch('https://kickoff.kiwi/data/feed.json', { cache: 'no-store' });
const t = await r.text();
writeFileSync('probe/out-feed.json', t);
const j = JSON.parse(t);
console.log(r.status, t.length, 'bytes; version', j.site?.version, '; aussie domestic games', j.events.filter(e => e.team === 'audomestic').length);
