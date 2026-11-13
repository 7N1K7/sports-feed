// 13 Nov: does any free-key answer carry an image licence field? (free key only)
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; kickoff-probe)' };
const api = p => fetch('https://www.thesportsdb.com/api/v1/json/123/' + p, { headers: UA }).then(r => r.json()).catch(e => ({ err: e.message }));
const s = await api('searchplayers.php?p=Israel_Adesanya'); const id = s.player?.[0]?.idPlayer;
console.log('LICENCE CHECK player id', id);
for (const [p, k] of [[`lookupplayer.php?id=${id}`, 'players'], ['lookupteam.php?id=133604', 'teams'], ['eventsnextleague.php?id=4328', 'events']]) {
  const d = await api(p); const x = (d[k] || [])[0] || {};
  console.log(`\n${p}: ${Object.keys(x).length} keys`); console.log(' all keys:', Object.keys(x).join(' '));
  console.log(' licence-ish:', JSON.stringify(Object.fromEntries(Object.entries(x).filter(([kk]) => /creative|licen|cc|locked|copyright|credit|author|source/i.test(kk)))));
}
