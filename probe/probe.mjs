// probe 131: the live feed once v415 is up (golf top 10s, squads), and whether the wheelchair World Cup has a squads page
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
let cov = {};
for (let i = 0; i < 40; i++) { try { cov = await (await fetch('https://kickoff.kiwi/data/coverage.json?t=' + Date.now())).json(); } catch {} if (cov.v >= 415) break; await new Promise(r => setTimeout(r, 20000)); }
console.log('coverage v', cov.v, cov.at);
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?t=' + Date.now())).json();
const d = f.diag || {};
console.log('golfTop10:', d.golfTop10); console.log('teamSquads:', d.teamSquads);
const golf = (f.events || []).filter(e => e.sport === 'golf' && e.leaders?.length);
console.log('golf with top 10:', golf.map(e => `${e.title || e.comp} ${e.leaders.length} rows, Kiwis ${e.leaders.filter(r => r.nz).length}`).join(' | '));
for (const s of ['golf', 'baseball', 'league', 'basketball']) console.log(s, JSON.stringify(cov.cov?.[s]));
const t = ['2026 Wheelchair Rugby League World Cup squads', '2026 Wheelchair Rugby League World Cup'];
const j = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(t.join('|')), { headers: UA })).json();
for (const p of j.query?.pages || []) { const c = p.revisions?.[0]?.slots?.main?.content || '';
  console.log(`\n${p.title}${p.missing ? ' MISSING' : ''} ${c.length} headings: ${[...c.matchAll(/^(=+)[^=\n]+\1\s*$/gm)].map(m => m[0].trim()).join(' / ').slice(0, 900)}`);
  const i = c.search(/^=+\s*(Squads?|Teams)\s*=+/im); if (i >= 0) console.log(c.slice(i, i + 1200)); }
