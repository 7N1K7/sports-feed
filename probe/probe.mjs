import { writeFileSync } from 'fs';
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
const e = f.events.find(e => /Gallen/.test(e.home + e.away));
writeFileSync('probe/out.txt', `feed ${f.generatedAt} v${f.site?.version}\n` + (e ? JSON.stringify({ id: e.id, team: e.team, tags: e.tags, startUTC: e.startUTC, broadcast: e.broadcast, watchAU: e.watchAU, homeImg: !!e.homeImg, awayImg: !!e.awayImg }) : 'not found') + '\n');
