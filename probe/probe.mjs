const UA = { 'user-agent': 'nz-sports-feed/1.0 (https://7n1k7.github.io/sports-feed/)' };
const api = q => fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&' + q, { headers: UA }).then(r => r.json());
const get = async t => (await api('action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(t))).query.pages[0]?.revisions?.[0]?.slots?.main?.content || '';
for (const t of ["2026 Men's Rugby League World Cup", "2026 Women's Rugby League World Cup", '2026 Hilux NPC', '2026–27 A-League Men', '2026–27 Big Bash League season', '2026 Super Rugby Pacific season', '2026 Wheelchair Rugby League World Cup']) {
  const w = await get(t);
  console.log('\n######## PAGE', t, w.length);
  const tr = [...w.matchAll(/\{\{\s*([^|}#\n]*?(?:table|standings|Table|Standings)[^|}\n]*)\s*(\|[^}]*)?\}\}/g)].map(m => m[0].slice(0, 120));
  console.log('TRANSCLUDES', [...new Set(tr)].slice(0, 10));
  const i = w.indexOf('#invoke:Sports table');
  console.log(i >= 0 ? w.slice(i - 30, i + 2200) : '(no invoke)');
  const b = w.search(/\{\{\s*(\d+TeamBracket|Round\d+|[A-Za-z ]*bracket)/i);
  console.log('BRACKET', b >= 0 ? w.slice(b, b + 900) : 'none');
}
for (const t of ['Template:2026–27 A-League Men table', "Template:2026–27 Big Bash League table"]) {
  const w = await get(t);
  console.log('\n######## TPL', t, w.length);
  console.log(w.slice(0, 2500));
}
