import { writeFileSync } from 'fs';
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
const pick = f.events.filter(e => ['allwhites', 'footballferns'].includes(e.team) || /^(ss-|pak-sl|sa-ban)/.test(e.id || '') || (/Sheffield|Pakistan v Sri|South Africa v Bang/.test(e.comp || '') && Date.parse(e.startUTC) > Date.now()));
writeFileSync('probe/out.txt', `feed ${f.generatedAt} v${f.site?.version}\n` + pick.map(e => `${e.id} ${e.startUTC} ${e.timeTBC ? 'TBC' : ''} ${e.team} ${e.home} v ${e.away} | ${e.broadcast || ''}`).join('\n') + '\n');
