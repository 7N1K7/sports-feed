import { writeFileSync } from 'fs';
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
const semis = f.events.filter(e => /Semi-final|, Final/.test(e.comp || '') && e.sport === 'league').length;
writeFileSync('probe/out.txt', ['generated ' + f.generatedAt, 'thinWeeks ' + JSON.stringify(f.checks.thinWeeks), 'noResult ' + f.checks.noResult.length, 'RLWC knockout cards ' + semis].join('\n') + '\n');
