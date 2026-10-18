const UA = { 'user-agent': 'nz-sports-feed/1.0 (https://7n1k7.github.io/sports-feed/)' };
const api = q => fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&' + q, { headers: UA }).then(r => r.json());
for (const s of ['2026 Farah Palmer Cup season', '2026–27 Super Smash season', 'Men\'s Super Smash 2026–27', '2026 NRL season results', '2026 Wheelchair Rugby League World Cup', '2026 Hilux NPC', 'All Blacks 2026 end of year tour', 'Wallabies 2026 spring tour']) {
  const r = await api('action=query&list=search&srlimit=5&srsearch=' + encodeURIComponent(s));
  console.log('SEARCH', s, '=>', r.query.search.map(x => x.title).join(' | '));
}
const show = async (t, re, n = 1400) => {
  const r = await api('action=parse&prop=wikitext&redirects=1&page=' + encodeURIComponent(t));
  const w = r.parse?.wikitext || '';
  console.log('\n######## PAGE', t, w.length, r.error?.code || '');
  const i = w.search(re);
  console.log(i >= 0 ? w.slice(i, i + n) : '(no match)');
  return w;
};
const BOX = /\{\{\s*(rugby ?box|rugby ?league ?box|football ?box|footballbox|Single-innings|Limited overs|Two-innings)/i;
let w = await show("2026 Men's Rugby League World Cup", BOX, 1500);
const i = w.search(/score\s*=\s*\d/); console.log('FILLED:', w.slice(Math.max(0, i - 300), i + 900));
await show("2026 Hilux NPC", BOX, 1200);
w = await show("2026 Hilux NPC", /\{\{rugbybox[^}]*score\s*=\s*\d/i, 900);
await show("2026 men's rugby union internationals", BOX, 1500);
await show("2026 women's rugby union internationals", BOX, 900);
await show("2026 New Zealand rugby union tour of South Africa", BOX, 900);
await show("2026–27 Ford Trophy", BOX, 900);
await show("2026 NRL season results", /\{\||\{\{\s*rugby ?league ?box/i, 1500);
const tsdb = async q => { try { const r = await fetch('https://www.thesportsdb.com/api/v1/json/123/' + q); const t = await r.text(); let d; try { d = JSON.parse(t) } catch { console.log('TSDB', q, r.status, t.slice(0, 80)); return } const k = Object.keys(d)[0]; const v = d[k]; console.log('TSDB', q, k, Array.isArray(v) ? v.length : v, Array.isArray(v) ? v.slice(0, 12).map(e => [e.strTimestamp, e.strEvent, e.intHomeScore, e.intAwayScore, e.strStatus, e.strVenue].join(' ')).join(' || ') : ''); } catch (e) { console.log('TSDB', q, 'ERR', e.message) } await new Promise(r => setTimeout(r, 2500)); };
await tsdb('eventsround.php?id=4356&r=1&s=2026-2027');
await tsdb('eventsround.php?id=4356&r=2&s=2026-2027');
await tsdb('searchteams.php?t=Wellington_Phoenix');
await tsdb('eventsnext.php?id=136052');
await tsdb('eventslast.php?id=136052');
await tsdb('eventsseason.php?id=4356&s=2026-2027');
await tsdb('eventsseason.php?id=4443&s=2026');
