// probe 71: every side in the live feed that has no logo (national sides use flags, so they're listed apart)
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
const sides = new Map();
for (const e of f.events) {
  if (['motor', 'tennis'].includes(e.sport)) continue;
  for (const [n, logo] of [[e.home, e.homeLogo], [e.away, e.awayLogo]]) {
    if (!n || /^(TBC|TBA|TBD)$/i.test(n)) continue;
    const k = e.sport + '|' + n, v = sides.get(k) || { sport: e.sport, n, logo: false, comps: new Set(), games: 0 };
    v.logo ||= !!logo; v.comps.add(e.comp || ''); v.games++; sides.set(k, v);
  }
}
const all = [...sides.values()];
console.log('generated', f.generated || f.updated, '| sides', all.length, '| with logo', all.filter(v => v.logo).length);
for (const v of all.filter(v => !v.logo).sort((a, b) => a.sport.localeCompare(b.sport) || a.n.localeCompare(b.n)))
  console.log(`${v.sport} | ${v.n} | ${v.games} games | ${[...v.comps].slice(0, 3).join(' / ')}`);
