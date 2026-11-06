import { writeFileSync } from 'fs';
const out = [];
for (const t of ["Northern Districts men's cricket team", "Northern Districts women's cricket team", 'Wellington cricket team']) {
  const r = await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(t), { headers: { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed)' } });
  const j = await r.json(), pg = j.query.pages[0], c = pg.revisions?.[0]?.slots?.main?.content || '';
  out.push(`== ${t} -> ${pg.title} ${pg.missing ? 'MISSING' : ''} len ${c.length} redirects ${JSON.stringify(j.query.redirects || [])}`);
  out.push(...c.split('\n').filter(l => /^=+/.test(l)).map(l => '  ' + l));
  const i = c.search(/=+\s*(Current )?squad/i); if (i >= 0) out.push('  SQUAD: ' + c.slice(i, i + 900).replace(/\n/g, ' ⏎ '));
}
writeFileSync('probe/out.txt', out.join('\n') + '\n');
