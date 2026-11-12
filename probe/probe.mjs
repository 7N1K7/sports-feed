// 13 Nov: a copy of the live feed for the daily check
import { writeFileSync } from 'fs';
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).text();
writeFileSync('probe/out-feed13.json', f);
