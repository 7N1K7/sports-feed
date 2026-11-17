const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
console.log('now', new Date().toISOString());
// no scores printed: ids, names, times and sources only
const n = (f.events || []).filter(e => e.sport === 'cricket' && /Pakistan|Sri Lanka/.test(`${e.home} ${e.away}`) && Math.abs(Date.parse(e.startUTC) - Date.now()) < 12 * 864e5);
for (const e of n) { const { score, summary, result, scorecard, innings, ...r } = e; console.log(JSON.stringify(r).slice(0, 900)); }
