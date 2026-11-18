const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
const d = f.diag || {};
for (const k of Object.keys(d).filter(k => /face|pic|logo|photo|img/i.test(k))) console.log('DIAG', k, ':', String(d[k]).slice(0, 700));
// fight cards coming up: who has a picture (names only, no results)
const up = f.events.filter(e => /^(mma|boxing)$/.test(e.sport) && e.status !== 'final').sort((a, b) => a.startUTC.localeCompare(b.startUTC));
for (const e of up) {
  const card = (e.card || []).map(b => `${b.aImg ? '+' : '-'}${b.a} v ${b.bImg ? '+' : '-'}${b.b}`);
  console.log('EV', e.startUTC.slice(0, 10), e.sport, e.team, '|', e.comp, '|', (e.homeLogo ? '+' : '-') + e.home, 'v', (e.awayLogo ? '+' : '-') + e.away, '| card', (e.card || []).length, '|', card.join(' ; ').slice(0, 900));
}
const cd = await (await fetch('https://kickoff.kiwi/data/coverage-detail.json?' + Date.now())).json();
const miss = cd.sides.filter(s => !(s.f & 1)); const by = {}; for (const s of miss) (by[s.s] ||= []).push(`${s.n} [${s.c}]`);
for (const [k, v] of Object.entries(by)) console.log('NOPIC', k, v.length, ':', v.join(' ; ').slice(0, 1500));
const cov = await (await fetch('https://kickoff.kiwi/data/coverage.json?' + Date.now())).json();
console.log('COV [games,time,watch,sqGames,squads,sides,pic,links,guide,streams]', JSON.stringify(cov.cov));
