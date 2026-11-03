import { writeFileSync } from 'fs';
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
const c = f.checks || {};
writeFileSync('probe/out.txt', `feed ${f.generatedAt} v${f.site?.version}\n` + JSON.stringify(c, null, 1) + '\n');
