// probe 101: remaining picture and team-link gaps, and the TV guide / Supercars times after the latest runs
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
console.log('generated', f.generatedAt);
for (const [k, c] of Object.entries(f.coverage || {})) console.log(`${k}: pic ${c.pic}/${c.sides} links ${c.links}/${c.sidesL ?? c.sides} | no pic: ${c.gaps.pic.join(', ')} | no link: ${(c.gaps.links || []).join(', ')}`);
console.log('\nsupercarsTimes:', f.diag?.supercarsTimes, '\ntvGuide:', String(f.diag?.tvGuide || '').slice(0, 600));
for (const e of f.events.filter(e => e.sport === 'boxing' && Date.parse(e.startUTC) > Date.now() - 864e5)) console.log('boxing', e.startUTC.slice(0, 10), e.home, '|', e.away, '|', e.homeLogo ? 'pic' : '-', e.awayLogo ? 'pic' : '-', e.source);
