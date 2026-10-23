// probe 134: the live feed's coverage and its biggest gaps per sport
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?t=' + Date.now())).json();
const cov = f.coverage || f.diag?.coverage || {};
console.log('feed keys:', Object.keys(f).join(', '));
for (const [sp, c] of Object.entries(cov)) {
  const pc = (a, b) => b ? Math.round(100 * a / b) + '%' : '-';
  console.log(`\n${sp}: games ${c.games}, time ${pc(c.time, c.games)}, watch ${pc(c.watch, c.games)}, squads ${pc(c.squads, c.sqGames)}, pic ${pc(c.pic, c.sides)}, links ${pc(c.links, c.sides)}, guide ${c.guide || 0}`);
  const g = c.gaps || {};
  for (const k of ['time', 'watch', 'squads']) if (g[k]?.length) console.log(`  ${k} gaps:`, JSON.stringify(g[k].slice(0, 8)));
  for (const k of ['pic', 'links']) if (g[k]?.length) console.log(`  ${k} gaps:`, [...new Set(g[k])].slice(0, 25).join(', '));
}
