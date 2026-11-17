const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
const lo = Date.now() - 864e5, hi = Date.now() + 6 * 864e5;
// names, times and competitions only: no scores
for (const e of f.events.filter(e => Date.parse(e.startUTC) > lo && Date.parse(e.startUTC) < hi && (/Breakers|Phoenix|Melbourne/.test(`${e.home} ${e.away}`) && /basketball|football/.test(e.sport)))) console.log(e.id, '|', e.startUTC, '|', e.home, 'v', e.away, '|', e.comp, '|', e.team, '| tv', (e.tv || []).map(x => x.ch).join(','));
