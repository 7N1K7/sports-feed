const UA = { 'user-agent': 'nz-sports-feed/1.0 (https://7n1k7.github.io/sports-feed/)' };
const api = q => fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&' + q, { headers: UA }).then(r => r.json());
const get = async t => (await api('action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(t))).query.pages[0]?.revisions?.[0]?.slots?.main?.content || '';
for (const [t, re] of [["2026 Men's Rugby League World Cup", /==\s*Group A/], ["2026 Women's Rugby League World Cup", /==\s*Group A/], ['2026 Hilux NPC', /==\s*(Standings|Table|Log)/i], ['2026 Farah Palmer Cup', /==\s*(Standings|Table)/i], ['Template:2026 Super Rugby Pacific standings', /./]]) {
  const w = await get(t);
  console.log('\n######## PAGE', t, w.length);
  const i = w.search(re);
  console.log(i >= 0 ? w.slice(i, i + 2600) : '(none)');
}
