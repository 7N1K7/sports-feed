import fs from 'fs';
const t = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).text();
fs.writeFileSync(new URL('./out-feed.json', import.meta.url), t);
fs.writeFileSync(new URL('./out.txt', import.meta.url), 'feed ' + t.length);
