// probe 80: the live feed's data coverage
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
const pc = (n, d) => d ? Math.round(100 * n / d) + '%' : '-';
for (const [k, c] of Object.entries(f.coverage || {}).sort((a, b) => b[1].games - a[1].games)) {
  console.log(`${k}: games ${c.games} | times ${pc(c.time, c.games)} | watch ${pc(c.watch, c.games)} | squads ${pc(c.squads, c.sqGames)} | pictures ${pc(c.pic, c.sides)} (${c.pic}/${c.sides}) | links ${pc(c.links, c.sides)}`);
  const g = c.gaps; for (const [l, x] of [['time', g.time], ['watch', g.watch], ['squads', g.squads], ['pic', g.pic], ['links', g.links]]) if (x.length) console.log(`   no ${l}: ${x.map(y => Array.isArray(y) ? `${y[0]} (${y[1]})` : y).join(', ').slice(0, 300)}`);
}
