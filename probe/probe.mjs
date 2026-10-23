// probe 114: v390 live: motor sessions in the feed
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
console.log('generated', f.generatedAt);
console.log('f1Times:', f.diag.f1Times, '\nsupercarsTimes:', f.diag.supercarsTimes);
for (const e of f.events.filter(e => e.session)) console.log(e.id, '|', e.comp, '|', e.startUTC, e.minor ? 'minor' : 'MAIN', '|', e.broadcast || '', (e.tv || []).map(x => x.ch).join(','));
