// 13 Nov: second look for a WBBL or World Rugby Nations Cup logo: TheSportsDB's full league list and team records, Commons categories
const UA = { 'User-Agent': 'sports-feed-probe/1.0 (static site build check)' };
const j = async u => { try { const r = await fetch(u, { headers: UA }); const t = await r.text(); try { return JSON.parse(t); } catch { return { _status: r.status, _text: t.slice(0, 120) }; } } catch (e) { return { _err: e.message }; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T = 'https://www.thesportsdb.com/api/v1/json/123/';
const show = l => console.log(' ', l.idLeague, '|', l.strLeague, '|', l.strLeagueAlternate || '', '|', l.strSport, '|', l.strCountry || '', '| badge:', l.strBadge || '-', '| logo:', l.strLogo || '-', '| trophy:', l.strTrophy || '-');
await sleep(5000);
const ids = new Set();
{ const d = await j(T + 'all_leagues.php'); const L = d.leagues || [];
  console.log('== tsdb all_leagues', L.length, d._status || d._err || '');
  for (const l of L) if (/bash|wbbl|nations cup|nations champ/i.test([l.strLeague, l.strLeagueAlternate].join(' '))) { console.log(' ', l.idLeague, '|', l.strLeague, '|', l.strLeagueAlternate || '', '|', l.strSport); ids.add(l.idLeague); } }
for (const t of ['Adelaide Strikers Women', 'Sydney Sixers Women', 'Perth Scorchers Women', 'Hong Kong', 'Samoa', 'Tonga', 'Uruguay', 'Georgia']) {
  await sleep(4000);
  const d = await j(T + 'searchteams.php?t=' + encodeURIComponent(t));
  console.log('\n== tsdb team', t, (d.teams || []).length, d._status || d._err || '');
  for (const x of (d.teams || []).filter(x => /Cricket|Rugby/.test(x.strSport))) {
    const ls = [1, 2, 3, 4, 5, 6, 7].map(i => [x['idLeague' + (i > 1 ? i : '')], x['strLeague' + (i > 1 ? i : '')]]).filter(([id]) => id);
    console.log(' ', x.idTeam, x.strTeam, '|', x.strSport, '|', ls.map(([id, n]) => id + ' ' + n).join('; '));
    for (const [id, n] of ls) if (/bash|wbbl|nations/i.test(n || '')) ids.add(id);
  }
}
for (const id of [...ids].slice(0, 10)) { await sleep(4000); const x = await j(T + 'lookupleague.php?id=' + id); console.log('\n== tsdb lookupleague', id, x._status || ''); for (const l of x.leagues || []) show(l); }
const C = 'https://commons.wikimedia.org/w/api.php?format=json&origin=*&';
for (const cat of ['2026 World Rugby Nations Cup', "Women's Big Bash League 2025–26", "Women's Big Bash League matches", 'Big Bash League logos', 'World Rugby logos', 'Cricket Australia logos']) {
  const d = await j(C + 'action=query&generator=categorymembers&gcmlimit=60&gcmtype=file|subcat&gcmtitle=' + encodeURIComponent('Category:' + cat) + '&prop=imageinfo&iiprop=url|extmetadata&iiextmetadatafilter=LicenseShortName|Artist');
  const P = Object.values(d.query?.pages || {});
  console.log('\n== commons cat', cat, P.length, d._status || d._err || '');
  for (const p of P) if (!/ - \d{3}\.jpg$/.test(p.title) || /logo/i.test(p.title)) { const i = (p.imageinfo || [])[0] || {}; console.log(' ', p.title, '|', i.extmetadata?.LicenseShortName?.value || '-', '|', String(i.extmetadata?.Artist?.value || '').replace(/<[^>]+>/g, '').slice(0, 50), '|', (i.url || '').replace(/\?.*/, '')); }
  await sleep(1000);
}
for (const q of ['WBBL', 'Weber WBBL', 'Women Big Bash logo', 'intitle:WBBL', 'intitle:"Nations Cup" logo', 'World Rugby Nations Cup logo svg']) {
  const d = await j(C + 'action=query&generator=search&gsrnamespace=6&gsrlimit=15&gsrsearch=' + encodeURIComponent(q) + '&prop=imageinfo&iiprop=url|extmetadata&iiextmetadatafilter=LicenseShortName|Artist');
  const P = Object.values(d.query?.pages || {});
  console.log('\n== commons search', q, P.length, d._status || d._err || '');
  for (const p of P) if (!/\.pdf$|\.djvu$/i.test(p.title)) { const i = (p.imageinfo || [])[0] || {}; console.log(' ', p.title, '|', i.extmetadata?.LicenseShortName?.value || '-', '|', String(i.extmetadata?.Artist?.value || '').replace(/<[^>]+>/g, '').slice(0, 50), '|', (i.url || '').replace(/\?.*/, '')); }
  await sleep(1000);
}
