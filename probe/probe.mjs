const W = 'https://en.wikipedia.org/w/api.php?format=json&formatversion=2&', H = { 'user-agent': 'kickoff-feed-probe/1.0' };
const wt = async t => (await (await fetch(W + 'action=parse&prop=wikitext&page=' + encodeURIComponent(t), { headers: H })).json()).parse?.wikitext || '';
const x = await wt("New Zealand men's national football team results (2020–present)");
const i = x.indexOf('|date=15 November 2026'); console.log('wiki:', i < 0 ? 'not found' : x.slice(i, i + 420).replace(/<ref[\s\S]*?(<\/ref>|\/>)/g, '<ref/>'));
for (const q of ['New_Zealand_vs_India', 'India_vs_New_Zealand']) {
  const r = await (await fetch('https://www.thesportsdb.com/api/v1/json/123/searchevents.php?e=' + q)).json();
  for (const e of (r.event || []).filter(e => /^2026-11/.test(e.dateEvent || ''))) console.log('tsdb', q, e.idEvent, e.strLeague, e.dateEvent, e.strTime, 'status', e.strStatus, 'score', e.intHomeScore, e.intAwayScore);
}
