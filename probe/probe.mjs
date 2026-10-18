const UA = { 'user-agent': 'nz-sports-feed/1.0 (https://7n1k7.github.io/sports-feed/)' };
const api = q => fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&' + q, { headers: UA }).then(r => r.json());
const searches = ['2026 Bunnings NPC', '2026 Rugby League World Cup', '2026 Nations Championship rugby', '2026 end-of-year rugby union internationals', '2026–27 A-League Men', 'List of UFC events', '2027 Super Rugby Pacific season', '2026–27 Big Bash League season', "2026–27 Women's Big Bash League season", 'New Zealand cricket team 2026–27', "2026 Farah Palmer Cup", '2026 Pacific Championships rugby league', 'New Zealand women cricket team in Australia 2026', '2026–27 Super Smash', '2026–27 Plunket Shield'];
for (const s of searches) {
  const r = await api('action=query&list=search&srlimit=4&srsearch=' + encodeURIComponent(s));
  console.log('SEARCH', s, '=>', r.query.search.map(x => x.title).join(' | '));
}
const pages = process.argv.slice(2);
for (const t of ['2026 Bunnings Warehouse NPC', '2026 Rugby League World Cup', '2026–27 A-League Men', 'List of UFC events', '2026–27 Big Bash League season']) {
  const r = await api('action=parse&prop=wikitext&redirects=1&page=' + encodeURIComponent(t));
  const w = r.parse?.wikitext || JSON.stringify(r.error);
  console.log('\n######## PAGE', t, w.length);
  const tpl = [...w.matchAll(/\{\{\s*([A-Za-z][^|}\n]{2,40})/g)].map(m => m[1].trim());
  const counts = {}; tpl.forEach(n => counts[n] = (counts[n] || 0) + 1);
  console.log(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15));
  const i = w.search(/\{\{\s*(rugby ?box|rugby league ?box|football ?box|Single-innings|Limited overs|mma)/i);
  console.log(i >= 0 ? w.slice(i, i + 1800) : w.slice(0, 1500));
}
