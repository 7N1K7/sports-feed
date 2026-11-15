const W = 'https://en.wikipedia.org/w/api.php?format=json&formatversion=2&';
const H = { 'user-agent': 'kickoff-feed-probe/1.0' };
const wt = async t => (await (await fetch(W + 'action=parse&prop=wikitext&page=' + encodeURIComponent(t), { headers: H })).json()).parse?.wikitext || '';
const alw = await wt('2026–27 A-League Women');
console.log((alw.match(/\|\s*match_WEL_SYD\s*=[^\n]*/g) || ['no match_WEL_SYD']).join('\n'));
const i = alw.search(/Wellington Phoenix|WEL/); console.log((alw.match(/[^\n]*(Porirua|15 November)[^\n]*/g) || []).slice(0, 6).join('\n'));
