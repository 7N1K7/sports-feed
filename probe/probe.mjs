// probe 132: how the wheelchair World Cup page sets out its squads (and the men's and women's World Cup pages)
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const t = ['2026 Wheelchair Rugby League World Cup', '2026 Rugby League World Cup squads', "2026 Women's Rugby League World Cup squads"];
const j = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(t.join('|')), { headers: UA })).json();
for (const p of j.query?.pages || []) { const c = p.revisions?.[0]?.slots?.main?.content || '';
  console.log(`\n##### ${p.title}${p.missing ? ' MISSING' : ''} ${c.length}`);
  const i = c.search(/^===\s*Squads\s*===/im);
  if (i >= 0) console.log(c.slice(i, i + 5000));
  else console.log('headings:', [...c.matchAll(/^(=+)[^=\n]+\1\s*$/gm)].map(m => m[0].trim()).join(' / ').slice(0, 700), '\n', c.slice(0, 2500)); }
