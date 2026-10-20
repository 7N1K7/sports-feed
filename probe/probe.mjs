// probe 97: squad pages that don't read yet; games still without a start time
import { readSquad } from './sources.mjs';
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const pages = ['Northern Districts cricket team', 'Nottingham Forest F.C.', 'Canterbury rugby union team', 'Northland rugby union team', 'Taranaki rugby union team', 'Lebanon national rugby league team', "England women's national rugby league team", "Tonga women's national rugby league team", 'England national wheelchair rugby league team', 'Australia national wheelchair rugby league team'];
const q = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(pages.join('|')), { headers: UA })).json();
for (const pg of q.query.pages) {
  if (pg.missing) { console.log('\nMISSING', pg.title); continue; }
  const t = pg.revisions[0].slots.main.content, ps = readSquad(t);
  console.log(`\n### ${pg.title}: read ${ps.length} — ${ps.slice(0, 4).map(p => p.n).join(', ')}`);
  console.log('  headings:', [...t.matchAll(/^(==+)\s*([^=\n]+?)\s*\1\s*$/gm)].map(m => m[2]).filter(h => /squad|player|roster|current|team/i.test(h)).join(' | '));
  const i = t.search(/^=+[^=\n]*(squad|roster|players)[^=\n]*=+\s*$/im); if (i > 0 && ps.length < 8) console.log(t.slice(i, i + 700));
}
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
console.log('\nTBC times by sport:'); for (const [k, c] of Object.entries(f.coverage || {})) if (c.gaps?.time?.length) console.log(' ', k, JSON.stringify(c.gaps.time));
console.log('\nsupercarsTimes:', f.diag?.supercarsTimes);
