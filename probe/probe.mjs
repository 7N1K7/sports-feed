// probe 52: the live feed after v268: state squads, state badges, the cricket rankings
const j = await (await fetch('https://kickoff.kiwi/data/feed.json', { cache: 'no-store' })).json();
console.log('version', j.site?.version, '| stateSquads:', j.diag?.stateSquads);
console.log('squads:', (j.stateSquads || []).map(s => `${s.team} ${s.players.length} (${s.players.filter(p => p.ci).length} linked)`).join(', '));
const au = j.events.filter(e => e.team === 'audomestic'), logos = {};
for (const e of au) { logos[e.home] ||= !!e.homeLogo; logos[e.away] ||= !!e.awayLogo; }
console.log('logos:', JSON.stringify(logos));
for (const l of (j.rankings || []).filter(r => r.sport === 'cricket')) console.log(`${l.title} as of ${l.asOf}: ${l.rows.length} rows, last "${l.rows.at(-1)?.name}" ${l.rows.at(-1)?.val}`);
