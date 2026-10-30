// probe 227: the live feed as it is now, for a coverage sweep (out-feed.json)
import fs from 'fs';
const r = await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now()), t = await r.text();
fs.writeFileSync(new URL('./out-feed.json', import.meta.url), t);
fs.writeFileSync(new URL('./out.txt', import.meta.url), `feed ${r.status} ${t.length} bytes\n`);
