// 14 Nov daily check: do Wikipedia's pages have the flagged games yet (Wikipedia, CC BY-SA; read only)
const UA = { headers: { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' } };
const wt = async t => { const r = await fetch('https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&redirects=1&page=' + encodeURIComponent(t), UA); const j = await r.json(); return j.parse?.wikitext || ('MISSING ' + (j.error?.code || '')); };
const srch = async q => { const r = await fetch('https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=5&srsearch=' + encodeURIComponent(q), UA); return ((await r.json()).query?.search || []).map(x => x.title); };
console.log('WIKI');
console.log('search NZ football results:', (await srch('New Zealand national football team results 2026 India')).join(' | '));
console.log('search Ford Trophy:', (await srch('2026–27 Ford Trophy')).join(' | '));
for (const [page, pat] of [['2026–27 Ford Trophy', /12 November|8 November|Otago|Northern Districts/], ['Joshua Buatsi', /Hutchinson/], ['Willy Hutchinson', /Buatsi/], ['Paul Gallen', /Asofa|Solomona/], ['Nelson Asofa-Solomona', /Gallen/]]) {
  const t = await wt(page); console.log(`\n## ${page} (${t.length} chars)`);
  const lines = t.split('\n').filter(l => pat.test(l)).slice(0, 12); console.log(lines.map(l => '  ' + l.slice(0, 220)).join('\n') || '  (no matching line)');
}
