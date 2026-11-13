// 13 Nov: fourth look, slower: which TheSportsDB league holds the Nations Cup's games, and the leagues near the Nations Championship's id (5852)
const UA = { 'User-Agent': 'sports-feed-probe/1.0 (static site build check)' };
const j = async u => { try { const r = await fetch(u, { headers: UA }); const t = await r.text(); try { return JSON.parse(t); } catch { return { _status: r.status }; } } catch (e) { return { _err: e.message }; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T = 'https://www.thesportsdb.com/api/v1/json/123/';
await sleep(5000);
for (const e of ['Uruguay_vs_Georgia', 'Samoa_vs_Hong_Kong', 'Tonga_vs_Zimbabwe', 'Canada_vs_Spain']) {
  const d = await j(T + 'searchevents.php?e=' + e + '&s=2026');
  console.log('== event', e, d._status || '');
  for (const x of (d.event || []).filter(x => x.strSport === 'Rugby')) console.log(' ', x.dateEvent, x.strEvent, '| league', x.idLeague, x.strLeague, '| badge:', x.strLeagueBadge || '-');
  await sleep(6000);
}
for (const id of [5856, 5857, 5858, 5859, 5860, 5861, 5862, 5863, 5864, 5865, 5866, 5867, 5868, 5869, 5870, 5843, 5844, 5845, 5846, 5847, 5848, 5849, 5850, 5851]) {
  const d = await j(T + 'lookupleague.php?id=' + id); const l = (d.leagues || [])[0];
  console.log(id, l ? `${l.strSport} | ${l.strLeague} | ${l.strLeagueAlternate || ''} | badge: ${l.strBadge || '-'} | logo: ${l.strLogo || '-'}` : (d._status || d._err || 'none'));
  await sleep(6000);
}
