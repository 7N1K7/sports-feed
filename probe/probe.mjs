// probe 129: raw wikitext of squad pages that parse to nothing (MLB rosters that differ from the Brewers', Northern Districts, Lebanon, USA wheelchair)
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const titles = ['Template:New York Yankees roster', 'Template:Milwaukee Brewers roster', 'Northern Districts cricket team', 'Lebanon national rugby league team', 'United States national wheelchair rugby league team'];
const url = 'https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(titles.join('|'));
const j = await (await fetch(url, { headers: UA })).json();
console.log('redirects', JSON.stringify(j.query?.redirects || []), 'normalized', JSON.stringify(j.query?.normalized || []));
for (const p of j.query?.pages || []) {
  const t = p.revisions?.[0]?.slots?.main?.content || '';
  console.log(`\n===== ${p.title} (${t.length})`);
  if (p.title.startsWith('Template:')) { console.log(t.slice(0, 1800)); continue; }
  const heads = [...t.matchAll(/^(=+)[^=\n]+\1\s*$/gm)].map(m => m[0].trim());
  console.log('headings:', heads.join(' / ').slice(0, 1500));
  const i = t.search(/^=+\s*(?:<[^>]*>\s*)*(current squad|squad|current|players|team)/im);
  console.log('--- near squad:', i < 0 ? 'none' : t.slice(i, i + 1500));
}
