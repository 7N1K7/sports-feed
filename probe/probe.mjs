// 13 Nov: is there a WBBL or World Rugby Nations Cup logo we may use? TheSportsDB (key 123) and Wikimedia Commons
const UA = { 'User-Agent': 'sports-feed-probe/1.0 (static site build check)' };
const j = async u => { try { const r = await fetch(u, { headers: UA }); const t = await r.text(); try { return JSON.parse(t); } catch { return { _status: r.status, _text: t.slice(0, 200) }; } } catch (e) { return { _err: e.message }; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T = 'https://www.thesportsdb.com/api/v1/json/123/';
const show = l => console.log(' ', l.idLeague, '|', l.strLeague, '|', l.strLeagueAlternate || '', '|', l.strSport, '|', l.strCountry || '', '| badge:', l.strBadge || '-', '| logo:', l.strLogo || '-');
for (const q of ['search_all_leagues.php?c=Australia&s=Cricket', 'search_all_leagues.php?s=Cricket', 'search_all_leagues.php?c=Worldwide&s=Rugby', 'search_all_leagues.php?c=International&s=Rugby', 'search_all_leagues.php?s=Rugby']) {
  const d = await j(T + q); const L = d.countries || d.leagues || [];
  console.log('\n== tsdb', q, L.length, d._status || d._err || '');
  for (const l of L) if (/bash|wbbl|nations|women/i.test([l.strLeague, l.strLeagueAlternate].join(' '))) show(l);
  await sleep(2500);
}
for (const n of ['Australian Womens Big Bash League', "Women's Big Bash League", 'WBBL', 'World Rugby Nations Cup', 'Nations Cup', 'Rugby Nations Cup']) {
  const d = await j(T + 'search_all_leagues.php?l=' + encodeURIComponent(n));
  console.log('\n== tsdb l=', n, JSON.stringify(d).slice(0, 300));
  await sleep(2500);
}
const C = 'https://commons.wikimedia.org/w/api.php?format=json&origin=*&';
for (const q of ['WBBL logo', "Women's Big Bash League logo", 'Big Bash League logo', 'World Rugby Nations Cup', 'World Rugby Nations Cup logo', 'Nations Cup rugby logo']) {
  const d = await j(C + 'action=query&generator=search&gsrnamespace=6&gsrlimit=12&gsrsearch=' + encodeURIComponent(q) + '&prop=imageinfo&iiprop=url|extmetadata|size&iiextmetadatafilter=LicenseShortName|Artist|UsageTerms');
  const P = Object.values(d.query?.pages || {});
  console.log('\n== commons', q, P.length, d._status || d._err || '');
  for (const p of P) { const i = (p.imageinfo || [])[0] || {}; console.log(' ', p.title, '|', i.width + 'x' + i.height, '|', i.extmetadata?.LicenseShortName?.value || '?', '|', String(i.extmetadata?.Artist?.value || '').replace(/<[^>]+>/g, '').slice(0, 50), '|', i.url); }
  await sleep(1000);
}
{ const d = await j(T + 'all_leagues.php'); const L = d.leagues || [];
  console.log('\n== tsdb all_leagues', L.length, d._status || d._err || '');
  for (const l of L) if (/bash|wbbl|nations cup|rugby.*nations|women.*cricket|cricket.*women/i.test([l.strLeague, l.strLeagueAlternate].join(' '))) console.log(' ', l.idLeague, '|', l.strLeague, '|', l.strLeagueAlternate || '', '|', l.strSport);
  const ids = L.filter(l => /bash|wbbl|nations cup/i.test([l.strLeague, l.strLeagueAlternate].join(' '))).map(l => l.idLeague);
  for (const id of ids.slice(0, 8)) { await sleep(2500); const x = await j(T + 'lookupleague.php?id=' + id); for (const l of x.leagues || []) show(l); }
}
for (const cat of ["Women's Big Bash League", 'Big Bash League', 'World Rugby Nations Cup', 'WBBL']) {
  const d = await j(C + 'action=query&generator=categorymembers&gcmlimit=50&gcmtitle=' + encodeURIComponent('Category:' + cat) + '&prop=imageinfo&iiprop=url|extmetadata&iiextmetadatafilter=LicenseShortName|Artist');
  const P = Object.values(d.query?.pages || {});
  console.log('\n== commons cat', cat, P.length, d._status || d._err || '');
  for (const p of P) { const i = (p.imageinfo || [])[0] || {}; console.log(' ', p.title, '|', i.extmetadata?.LicenseShortName?.value || '-', '|', String(i.extmetadata?.Artist?.value || '').replace(/<[^>]+>/g, '').slice(0, 50), '|', i.url || ''); }
  await sleep(1000);
}
