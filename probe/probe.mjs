// probe 105: TheSportsDB netball series and NBA, golf leagues; Wikipedia SailGP and golf schedules; ATP doubles rows
const UA = { 'User-Agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi; probe)' };
const j = async u => { try { const r = await fetch(u, { headers: UA }); return r.ok ? await r.json() : { status: r.status }; } catch (e) { return { error: e.message }; } };
const W = 'https://en.wikipedia.org/w/api.php?format=json&formatversion=2&';
const wikitext = async t => (await j(W + 'action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(t)))?.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content || '';
const section = (text, re) => { const i = text.search(re); if (i < 0) return ''; const rest = text.slice(i); const n = rest.slice(3).search(/\n==[^=]/); return n < 0 ? rest : rest.slice(0, n + 3); };
const T = 'https://www.thesportsdb.com/api/v1/json/123/';
const ev = e => `${e.dateEvent} ${e.strTime || ''} ${e.strEvent} [${e.strStatus || ''}] ${e.intHomeScore ?? ''}-${e.intAwayScore ?? ''} @${e.strVenue || ''} r${e.intRound || ''}`;
for (const [id, s] of [[5793, '2026'], [5793, '2025'], [5794, '2026'], [5794, '2027'], [4538, '2026']]) {
  const r = await j(`${T}eventsseason.php?id=${id}&s=${s}`);
  console.log(`TSDB season ${id} ${s}:`, (r.events || []).map(ev).join(' ; ') || JSON.stringify(r).slice(0, 120));
}
for (const id of [5793, 5794, 4387, 4434]) {
  const n = await j(`${T}eventsnextleague.php?id=${id}`), p = await j(`${T}eventspastleague.php?id=${id}`);
  console.log(`TSDB ${id} next ${(n.events || []).length}: ${(n.events || []).slice(0, 4).map(ev).join(' ; ')}`);
  console.log(`TSDB ${id} past ${(p.events || []).length}: ${(p.events || []).slice(0, 3).map(ev).join(' ; ')}`);
}
const tb = await j(`${T}lookuptable.php?l=4387&s=2026-2027`); console.log('NBA table:', (tb.table || []).slice(0, 5).map(t => `${t.intRank} ${t.strTeam} ${t.intWin}-${t.intLoss}`).join('; ') || JSON.stringify(tb).slice(0, 150));
const d = await j(`${T}eventsday.php?d=2026-10-23&l=4387`); console.log('NBA day 2026-10-23:', (d.events || []).length, (d.events || []).slice(0, 3).map(ev).join(' ; '));
for (const id of [4425, 4426, 4427, 4761]) { const l = await j(`${T}lookupleague.php?id=${id}`); console.log('league', id, (l.leagues || []).map(x => `${x.strLeague} (${x.strSport}) season ${x.strCurrentSeason}`).join('') || JSON.stringify(l).slice(0, 100)); }
for (const c of ['United%20States', 'Europe', 'World']) { const r = await j(`${T}search_all_leagues.php?c=${c}&s=Golf`); console.log('golf leagues', c, (r.countries || r.countrys || []).map(l => `${l.idLeague} ${l.strLeague}`).join('; ')); }
const g = await j(`${T}eventsnextleague.php?id=4425`); console.log('4425 next:', (g.events || []).slice(0, 5).map(ev).join(' ; '));

for (const t of ['2026 SailGP championship', '2027 SailGP championship']) {
  const x = await wikitext(t);
  console.log(`\nPAGE ${t} ${x.length}`, [...x.matchAll(/^(==+)\s*([^=]+?)\s*\1/gm)].map(m => m[1].length + ':' + m[2]).join(' / '));
  const sch = section(x, /==\s*(Schedule|Calendar|Events|Season schedule|Results)\s*==/i);
  console.log(sch.slice(0, 3000));
}
for (const t of ['2026 PGA Tour', '2026–27 PGA Tour of Australasia', '2026 LPGA Tour']) {
  const x = await wikitext(t);
  console.log(`\nPAGE ${t} ${x.length}`, [...x.matchAll(/^(==+)\s*([^=]+?)\s*\1/gm)].map(m => m[1].length + ':' + m[2]).join(' / '));
  const sch = section(x, /==\s*(Schedule|Tournament results|Results)\s*==/i);
  console.log(sch.slice(0, 2200));
}
const atp = await j(W + 'action=parse&prop=text&redirects=1&page=ATP%20rankings');
const html = atp?.parse?.text || '';
const i = html.search(/rankings \(doubles\) as of/i);
console.log('\nATP doubles at', i);
if (i > 0) { const tbl = html.slice(i).match(/<table[\s\S]*?<\/table>/)?.[0] || ''; console.log([...tbl.matchAll(/<tr[\s\S]*?<\/tr>/g)].slice(0, 5).map(m => m[0].replace(/\s+/g, ' ').slice(0, 700)).join('\n')); }
