// probe 85: the live feed after the YouTube, league squad and doubles changes
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
console.log('generated', f.generatedAt);
console.log('youtube:', f.diag?.youtube);
console.log('teamSquads:', f.diag?.teamSquads);
console.log('rankings tennis:', (f.rankings || []).filter(r => r.sport === 'tennis').map(r => `${r.title} ${r.rows.length} rows, ranks ${r.rows.slice(0, 4).map(x => x.rank).join(',')}`));
console.log('games with streams:'); for (const e of f.events.filter(e => e.yt)) console.log(' ', e.startUTC.slice(0, 16), e.comp, '|', e.home, 'v', e.away, '|', e.yt.map(x => `${x.ch} ${x.state} ${x.at.slice(0, 16)}`).join('; '));
console.log('league squads:', (f.teamSquads || []).filter(s => s.sport === 'league').map(s => `${s.g} ${s.team} ${s.players.length}`).join(', '));
console.log('coverage streams:', Object.entries(f.coverage || {}).map(([k, c]) => `${k} ${c.streams || 0}`).join(', '));
console.log('tennis diag:', (f.diag?.tennis || '').slice(0, 400));
