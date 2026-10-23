// probe 125: the live feed's data coverage (to compare with earlier builds), and the new NBA / baseball squads
let f = { events: [] };
try { f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json(); } catch (e) { console.log('feed error', e.message); }
console.log('site', JSON.stringify(f.site || {}), 'generated', f.generatedAt);
const slim = Object.fromEntries(Object.entries(f.coverage || {}).map(([k, c]) => [k, [c.games, c.time, c.watch, c.sqGames, c.squads, c.sides, c.pic, c.links, c.guide || 0, c.streams || 0]]));
console.log('COVERAGE ' + JSON.stringify(slim));
console.log('diag.teamSquads:', String(f.diag?.teamSquads).slice(0, 600));
const sq = f.teamSquads || [];
for (const sp of ['basketball', 'baseball']) console.log(sp, sq.filter(s => s.sport === sp).map(s => `${s.team} ${s.players.length}`).join(', '));
const one = sq.find(s => s.sport === 'baseball'); if (one) console.log('sample', one.team, JSON.stringify(one.players.slice(0, 5)));
for (const [k, c] of Object.entries(f.coverage || {})) console.log('gaps', k, JSON.stringify({ time: c.gaps?.time?.slice(0, 6), watch: c.gaps?.watch?.slice(0, 6), squads: c.gaps?.squads?.slice(0, 6), pic: c.gaps?.pic?.slice(0, 8) }).slice(0, 500));
