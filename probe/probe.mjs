import { writeFileSync } from 'fs';
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
const e = f.events.find(x => /Gallen/.test(x.home || ''));
writeFileSync('probe/out.txt', `feed ${f.generatedAt} v${f.site?.version}\nawayLogo ${e?.awayLogo ? 'yes' : 'no'} | ${e?.awayLogoCredit || ''}\nhomeLogo ${e?.homeLogo ? 'yes' : 'no'}\nfaces: ${String(f.diag?.faces || '').slice(0, 300)}\n`);
writeFileSync('probe/out-feed.json', JSON.stringify(f));
