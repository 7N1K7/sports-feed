const W = 'https://en.wikipedia.org/w/api.php?format=json&formatversion=2&';
const H = { 'user-agent': 'kickoff-feed-probe/1.0' };
const wt = async t => (await (await fetch(W + 'action=parse&prop=wikitext&page=' + encodeURIComponent(t), { headers: H })).json()).parse?.wikitext || '';
const around = (s, re, n = 700) => { const i = s.search(re); return i < 0 ? '(not found)' : s.slice(Math.max(0, i - 200), i + n); };
const alw = await wt('2026–27 A-League Women');
console.log('== ALW page length', alw.length); console.log(around(alw, /Wellington Phoenix[^\n]{0,200}Sydney FC|15 November 2026/));
const hjs = await wt('2026–27 Hallyburton Johnstone Shield');
console.log('== HJS page length', hjs.length, '| match templates:', (hjs.match(/\{\{\s*(Single-innings cricket match|Limited overs matches|cricket match summary)/gi) || []).length);
console.log(around(hjs, /14 November|15 November/, 500));
const s = await (await fetch(W + 'action=query&list=search&srlimit=5&srsearch=' + encodeURIComponent('New Zealand India football friendly November 2026 Christchurch'), { headers: H })).json();
console.log('== search', s.query?.search?.map(x => x.title).join(' | '));
for (const t of ["New Zealand men's national football team results (2020–present)", "New Zealand men's national football team"]) { const x = await wt(t); console.log('==', t, x.length); console.log(around(x, /15 November 2026/, 900)); }
