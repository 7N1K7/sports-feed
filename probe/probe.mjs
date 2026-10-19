// probe 13: the new steps on the published feed
const f = await (await fetch('https://7n1k7.github.io/sports-feed/data/feed.json?x=' + Date.now())).json();
console.log('version', f.site?.version, 'generated', f.generatedAt);
for (const k of ['espnCricket', 'sportmonks', 'bbc', 'rainHeadlines', 'fighterLinks', 'fighterLinksError', 'teamLinks', 'teamLinksError', 'logos', 'natBadges']) console.log(k, '=', JSON.stringify(f.diag?.[k]));
console.log('teamLinks sample', JSON.stringify(Object.entries(f.teamLinks || {}).slice(0, 25)));
const card = f.events.find(e => e.comp === 'UFC 333')?.card || [];
console.log('UFC 333 links', card.map(b => `${b.a}=${Object.keys(b.aLinks || {}).join('+') || '-'} / ${b.b}=${Object.keys(b.bLinks || {}).join('+') || '-'}`).join(' ; '));
for (const e of f.events.filter(e => e.sport === 'cricket' && (e.liveState || e.wxNews))) console.log('LIVE', e.home, 'v', e.away, '|', e.progress, '|', e.wxNews?.title || '');
const fpc = f.events.filter(e => e.team === 'fpc' || /All Blacks|Kiwis/.test(`${e.home} ${e.away}`)).slice(0, 8).map(e => `${e.home}:${e.homeLogo || e.homeBadge ? 'crest' : '-'} v ${e.away}:${e.awayLogo || e.awayBadge ? 'crest' : '-'}`);
console.log('crests', fpc.join(' ; '));
