import { writeFileSync } from 'fs';
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
const cov = f.coverage || f.diag?.coverage || {};
const out = [`feed ${f.generatedAt} v${f.site?.version} events ${f.events?.length}`, 'keys: ' + Object.keys(f).join(','), 'diag keys: ' + Object.keys(f.diag || {}).join(',')];
for (const [s, c] of Object.entries(cov)) out.push(`${s}: games ${c.games} time ${c.time} watch ${c.watch} squads ${c.squads}/${c.sqGames} pic ${c.pic}/${c.sides} links ${c.links}`, '  no time: ' + JSON.stringify((c.gaps?.time || []).slice(0, 8)), '  no watch: ' + JSON.stringify((c.gaps?.watch || []).slice(0, 10)), '  no squads: ' + JSON.stringify((c.gaps?.squads || []).slice(0, 8)), '  no pic: ' + (c.gaps?.pic || []).slice(0, 15).join('; '));
out.push('checks: ' + JSON.stringify(f.checks?.thinWeeks || []));
writeFileSync('probe/out.txt', out.join('\n') + '\n');
