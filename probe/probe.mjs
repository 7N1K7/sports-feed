// probe 10: is the live state of play reaching the published feed?
const f = await (await fetch('https://7n1k7.github.io/sports-feed/data/feed.json?x=' + Date.now())).json();
console.log('generated', f.generatedAt, 'version', f.site?.version);
console.log('espnCricket:', f.diag?.espnCricket);
for (const e of f.events.filter(e => e.sport === 'cricket' && (e.liveState || e.progress))) console.log('EV', e.home, 'v', e.away, '|', e.progress, '|', e.liveScore, '|', e.liveState, e.liveAt);
