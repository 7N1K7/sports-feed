import fs from 'fs';
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
const out = f.events.filter(e => /Japan/.test(e.home + e.away) && /Wales/.test(e.home + e.away)).map(e => `${e.id} ${e.startUTC} tbc=${e.timeTBC} ${e.home} v ${e.away} @${e.venue} ${e.broadcast}`);
fs.writeFileSync(new URL('./out.txt', import.meta.url), out.join('\n'));
