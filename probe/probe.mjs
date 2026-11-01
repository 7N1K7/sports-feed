// probe 253: a copy of the live feed (daily missed-games check)
import fs from 'fs';
const r = await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now(), { headers: { 'cache-control': 'no-cache' } });
const t = await r.text();
fs.writeFileSync(new URL('./out-feed.json', import.meta.url), t);
fs.writeFileSync(new URL('./out.txt', import.meta.url), `status ${r.status}, ${t.length} bytes, generated ${JSON.parse(t).generatedAt}\n`);
