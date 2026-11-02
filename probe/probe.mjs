import { writeFileSync } from 'fs';
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
writeFileSync('probe/out-feed.json', JSON.stringify(f));
writeFileSync('probe/out.txt', 'generated ' + f.generatedAt + '\n');
