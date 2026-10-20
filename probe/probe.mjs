// probe 88: the Supercars calendar on Wikipedia; the ATP doubles table rows 1-3
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const q = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent('2026 Supercars Championship|2027 Supercars Championship'), { headers: UA })).json();
for (const pg of q.query.pages) {
  if (pg.missing) { console.log('MISSING', pg.title); continue; }
  const t = pg.revisions[0].slots.main.content;
  console.log('#####', pg.title, t.length);
  for (const h of t.matchAll(/^==+[^=\n]+==+\s*$/gm)) console.log('  ', h[0]);
  const i = t.search(/^==+\s*(Calendar|Schedule|Race calendar)\s*==+/im); console.log(t.slice(i, i + 2600));
  const j = t.search(/^==+\s*(Results|Season summary|Results summary)\b[^\n]*==+/im); if (j > 0) console.log('\n--- results\n' + t.slice(j, j + 1800));
}
const r = await (await fetch('https://en.wikipedia.org/w/api.php?action=parse&format=json&formatversion=2&prop=text&page=ATP_rankings', { headers: UA })).json();
const h = r.parse.text, k = h.search(/ATP rankings \(doubles\) as of/i);
console.log('\n--- ATP doubles table html\n' + h.slice(k, k + 4000).replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/ (class|style|title|href|data-[a-z-]+|width|height|decoding|srcset|src|alt|typeof)="[^"]*"/g, '').replace(/\s+/g, ' ').slice(0, 2500));
