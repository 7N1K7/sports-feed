// probe 79: the team squads in the live feed
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
console.log('diag:', f.diag?.teamSquads);
console.log((f.teamSquads || []).map(s => `${s.sport}|${s.g}|${s.team} ${s.players.length} (links ${s.players.filter(p => p.wp || p.ci).length})`).join('\n'));
