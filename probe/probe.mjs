// probe 104: sources for NBL ladder, NBA, international netball, SailGP and golf
const UA = { 'User-Agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi; probe)' };
const j = async u => { try { const r = await fetch(u, { headers: UA }); return r.ok ? await r.json() : { status: r.status }; } catch (e) { return { error: e.message }; } };
const W = 'https://en.wikipedia.org/w/api.php?format=json&formatversion=2&';
const search = async q => (await j(W + 'action=query&list=search&srlimit=8&srsearch=' + encodeURIComponent(q)))?.query?.search?.map(s => s.title) || [];
const wikitext = async t => (await j(W + 'action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(t)))?.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content || '';
const section = (text, re) => { const i = text.search(re); if (i < 0) return ''; const rest = text.slice(i); const n = rest.slice(3).search(/\n==[^=]/); return n < 0 ? rest : rest.slice(0, n + 3); };

for (const q of ['Constellation Cup 2026', 'Silver Ferns 2026 netball', 'netball 2026 Australia New Zealand series', 'SailGP 2026 season', 'SailGP Season 7', '2026 PGA Tour', '2026 Ryan Fox', '2025–26 NBA season', '2026–27 NBA season'])
  console.log('SEARCH', q, '=>', (await search(q)).join(' | '));

const nbl = await wikitext('2026–27 NBL season');
console.log('\nNBL headings:', [...nbl.matchAll(/^(==+)\s*([^=]+?)\s*\1/gm)].map(m => m[1].length + ':' + m[2]).join(' / '));
const lad = section(nbl, /==\s*(Ladder|Standings)\s*==/i);
console.log('NBL ladder section:\n' + lad.slice(0, 2500));
const tpls = [...lad.matchAll(/\{\{\s*([^{}|]+?)\s*[|}]/g)].map(m => m[1]);
console.log('templates in ladder section:', tpls.join(' | '));
for (const t of tpls.filter(t => /ladder|standings|table/i.test(t)).slice(0, 2)) { const x = await wikitext('Template:' + t); console.log('TEMPLATE', t, x.length, '\n' + x.slice(0, 2500)); }
const res = section(nbl, /==\s*(Results|Regular season|Fixtures|Matches)/i);
console.log('\nNBL results section start:\n' + res.slice(0, 1500));

for (const t of ['2026 Constellation Cup', '2026 Netball Nations Cup', '2026 Taini Jamison Trophy Series']) { const x = await wikitext(t); console.log('\nPAGE', t, x.length, x.slice(0, 200).replace(/\n/g, ' ')); }

const T = 'https://www.thesportsdb.com/api/v1/json/123/';
for (const s of ['Basketball', 'Netball', 'Golf', 'Sailing']) {
  const r = await j(T + 'search_all_leagues.php?s=' + s);
  console.log('\nTSDB', s, (r.countries || r.countrys || r.leagues || []).slice(0, 40).map(l => `${l.idLeague} ${l.strLeague} [${l.strCountry || ''}]`).join('; ') || JSON.stringify(r).slice(0, 200));
}
const all = await j(T + 'all_leagues.php');
console.log('\nTSDB all_leagues matching:', (all.leagues || []).filter(l => /basket|netball|golf|sail|nbl|nba|pga/i.test(l.strLeague + ' ' + l.strSport)).map(l => `${l.idLeague} ${l.strLeague} (${l.strSport})`).join('; '));
