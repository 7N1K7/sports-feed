// probe 89: the ATP doubles table's first rows as wikitext; then the live feed's TV guide, Supercars and squads notes
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const q = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&titles=ATP_rankings', { headers: UA })).json();
const t = q.query.pages[0].revisions[0].slots.main.content, i = t.search(/rankings \(doubles\) as of/i);
console.log(t.slice(i - 300, i + 1600));
await new Promise(r => setTimeout(r, 240000));
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
console.log('\ngenerated', f.generatedAt);
for (const k of ['tvGuide', 'supercars', 'teamSquads', 'youtube']) console.log(`\n${k}:`, String(f.diag?.[k] || '').slice(0, 1800));
