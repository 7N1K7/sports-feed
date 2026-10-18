const UA = { 'user-agent': 'nz-sports-feed/1.0 (https://7n1k7.github.io/sports-feed/)' };
const api = q => fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&' + q, { headers: UA }).then(r => r.json());
for (const s of ['Bunnings NPC 2026 season', 'National Provincial Championship 2026', 'Farah Palmer Cup 2026 season', 'New Zealand national rugby union team 2026 tour', 'Black Ferns 2026 test', 'A-League Men 2026–27 regular season matches', 'Super Smash 2026–27 season', 'Ford Trophy 2026–27']) {
  const r = await api('action=query&list=search&srlimit=5&srsearch=' + encodeURIComponent(s));
  console.log('SEARCH', s, '=>', r.query.search.map(x => x.title).join(' | '));
}
const show = async (t, re, n = 1400) => {
  const r = await api('action=parse&prop=wikitext&redirects=1&page=' + encodeURIComponent(t));
  const w = r.parse?.wikitext || '';
  console.log('\n######## PAGE', t, w.length, r.error?.code || '');
  const tpl = [...w.matchAll(/\{\{\s*([A-Za-z][^|}\n]{2,40})/g)].map(m => m[1].trim().toLowerCase());
  const counts = {}; tpl.forEach(n => counts[n] = (counts[n] || 0) + 1);
  console.log(JSON.stringify(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12)));
  const i = w.search(re);
  console.log(i >= 0 ? w.slice(i, i + n) : '(no match)');
};
const BOX = /\{\{\s*(rugby ?box|rugby league ?box|rlbox|football ?box|footballbox|Single-innings|Limited overs|Test match|Two-innings)/i;
await show("2026 Men's Rugby League World Cup", BOX, 2200);
await show("2026 Women's Rugby League World Cup", BOX);
await show('List of 2027 Super Rugby Pacific matches', BOX);
await show('2026 Nations Championship', BOX);
await show('New Zealand cricket team in Australia in 2026–27', BOX);
await show('Indian cricket team in New Zealand in 2026–27', BOX);
await show("New Zealand women's cricket team in Australia in 2026–27", BOX);
await show('2026–27 Plunket Shield season', BOX);
await show('List of UFC events', /==\s*Scheduled events/i, 2500);
await show('List of UFC events', /==\s*Past events/i, 1500);
await show('2026–27 A-League Men', /==\s*(Regular season|Results|Matches|Fixtures)/i, 2000);
const tsdb = async q => { try { const r = await fetch('https://www.thesportsdb.com/api/v1/json/123/' + q); const t = await r.text(); let d; try { d = JSON.parse(t) } catch { console.log('TSDB', q, r.status, t.slice(0, 120)); return } const k = Object.keys(d)[0]; const v = d[k]; console.log('TSDB', q, k, Array.isArray(v) ? v.length : v, Array.isArray(v) ? v.slice(0, 3).map(e => [e.strTimestamp, e.strEvent, e.intHomeScore, e.intAwayScore, e.strStatus].join(' ')).join(' || ') : ''); } catch (e) { console.log('TSDB', q, 'ERR', e.message) } await new Promise(r => setTimeout(r, 2200)); };
for (const id of [4356, 4443, 4416, 4551, 4461]) { await tsdb('eventsnextleague.php?id=' + id); await tsdb('eventspastleague.php?id=' + id); }
await tsdb('eventsseason.php?id=4356&s=2026-2027');
await tsdb('eventsday.php?d=2026-10-17&l=4356');
