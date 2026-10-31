// probe 235: the whole live feed copied to out-feed.json, for the gap-filling sweep
import fs from 'fs';
const t = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).text();
fs.writeFileSync(new URL('./out-feed.json', import.meta.url), t);
fs.writeFileSync(new URL('./out.txt', import.meta.url), `copied ${t.length} bytes\n`);
