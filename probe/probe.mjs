const UA = { headers: { 'user-agent': 'kickoff-kiwi-probe/1.0' } };
const api = async q => (await fetch('https://en.wikipedia.org/w/api.php?format=json&' + q, UA)).json();
for (const q of ['2026–27 SVNS', 'SVNS 2027 sevens series', "2027 America's Cup", 'Louis Vuitton Cup 2027', '2026 Dubai Sevens', '2026–27 SVNS 2']) {
  const r = await api('action=query&list=search&srlimit=6&srsearch=' + encodeURIComponent(q));
  console.log('SEARCH', q, '=>', (r.query?.search || []).map(s => s.title).join(' | '));
}
for (const t of ['2026–27 SVNS', '2025–26 SVNS', "2027 America's Cup", "38th America's Cup", '2026 Dubai Sevens']) {
  const r = await fetch('https://en.wikipedia.org/w/index.php?action=raw&redirect=yes&title=' + encodeURIComponent(t), UA), x = r.ok ? await r.text() : '';
  console.log('\n=== PAGE', t, r.status, x.length, x.slice(0, 80).replace(/\n/g, ' '));
  console.log('headings:', [...x.matchAll(/^(=+)\s*(.*?)\s*=+\s*$/gm)].map(m => m[1].length + ':' + m[2]).join(' | ').slice(0, 900));
}
