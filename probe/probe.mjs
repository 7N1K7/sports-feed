// 13 Nov: third look: TheSportsDB's leagues near the Nations Championship's id (5852), and the full Australian cricket and world rugby lists
const UA = { 'User-Agent': 'sports-feed-probe/1.0 (static site build check)' };
const j = async u => { try { const r = await fetch(u, { headers: UA }); const t = await r.text(); try { return JSON.parse(t); } catch { return { _status: r.status }; } } catch (e) { return { _err: e.message }; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T = 'https://www.thesportsdb.com/api/v1/json/123/';
await sleep(3000);
for (const q of ['c=Australia&s=Cricket', 'c=World&s=Rugby', 'c=Worldwide&s=Rugby', 'c=International&s=Rugby', 'c=Australia&s=Rugby']) {
  const d = await j(T + 'search_all_leagues.php?' + q); const L = d.countries || [];
  console.log('== tsdb', q, L.length, d._status || d._err || '');
  for (const l of L) console.log(' ', l.idLeague, '|', l.strLeague, '|', l.strLeagueAlternate || '', '| badge:', l.strBadge || '-');
  await sleep(3000);
}
for (let id = 5838; id <= 5880; id++) {
  const d = await j(T + 'lookupleague.php?id=' + id); const l = (d.leagues || [])[0];
  console.log(id, l ? `${l.strSport} | ${l.strLeague} | ${l.strLeagueAlternate || ''} | badge: ${l.strBadge || '-'} | logo: ${l.strLogo || '-'}` : (d._status || d._err || 'none'));
  await sleep(2300);
}
