import { writeFileSync } from 'fs';
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
const c = f.checks || {};
writeFileSync('probe/out.txt', `feed ${f.generatedAt} v${f.site?.version}\n` + (c.noResult || []).map(x => `NR ${x.at} | ${x.s} | ${x.c} | ${x.n} | ${x.noSource ? 'nosrc' : ''}`).join('\n') + '\n' + (c.thinWeeks || []).map(x => 'TW ' + JSON.stringify(x)).join('\n') + '\n');
