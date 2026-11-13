// 14 Nov daily check: does Wikipedia have the All Whites v India friendly yet (read only)
const UA = { headers: { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' } };
const wt = async t => { const r = await fetch('https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&redirects=1&page=' + encodeURIComponent(t), UA); const j = await r.json(); return j.parse?.wikitext || ('MISSING ' + (j.error?.code || '')); };
console.log('AW');
for (const page of ["New Zealand men's national football team results (2020–present)", 'India national football team results (2020–present)', "New Zealand men's national football team"]) {
  const t = await wt(page); console.log(`\n## ${page} (${t.length})`);
  const i = t.search(/November 2026[\s\S]{0,400}?India|India[\s\S]{0,300}?November 2026/); 
  const k = t.indexOf('12 November 2026'); const j = k >= 0 ? k : i;
  console.log(j >= 0 ? t.slice(Math.max(0, j - 100), j + 900).replace(/\n/g, ' ¶ ') : '(no November 2026 India game)');
}
