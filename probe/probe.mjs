// 15 Nov, the daily check: the live feed's age and its checks (public data), and a copy of the feed
import { writeFileSync } from 'fs';
const t = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).text(), f = JSON.parse(t);
writeFileSync('probe/out-feed15.json', t);
console.log('DAILY15 generatedAt', f.generatedAt, 'age min', Math.round((Date.now() - Date.parse(f.generatedAt)) / 60000), 'events', (f.events || []).length);
console.log(JSON.stringify(f.checks || {}, null, 1).slice(0, 12000));
console.log('diag', JSON.stringify(f.diag?.domesticFromWiki ?? f.diag?.checks ?? null));
