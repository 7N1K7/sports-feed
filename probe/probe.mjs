// probe 96: how TheSportsDB lists Supercars events (rounds, names, times)
const T = 'https://www.thesportsdb.com/api/v1/json/123/';
for (const q of ['eventsseason.php?id=4489&s=2026', 'eventsround.php?id=4489&r=12&s=2026', 'eventsround.php?id=4489&r=33&s=2026', 'eventsnextleague.php?id=4489']) {
  const r = await fetch(T + q); const t = await r.text(); let d; try { d = JSON.parse(t); } catch { console.log(q, r.status, t.slice(0, 100)); continue; }
  const evs = d.events || [];
  console.log(`\n${q}: ${evs.length}`); for (const e of evs.slice(-14)) console.log('  ', e.intRound, e.dateEvent, e.strTime, e.strTimestamp, '|', e.strEvent);
  await new Promise(r => setTimeout(r, 2500));
}
