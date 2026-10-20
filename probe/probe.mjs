// probe 77: the squad section's wikitext from one page of each kind, to write readers for them
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const pages = ['Wellington Phoenix FC', 'New Zealand Breakers', 'New Zealand national rugby union team', 'Blues (Super Rugby)', 'Auckland cricket team', 'Sydney Sixers (WBBL)', 'Canterbury cricket team'];
const r = await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(pages.join('|')), { headers: UA });
const j = await r.json();
for (const pg of j.query.pages) {
  const t = pg.revisions?.[0]?.slots?.main?.content || '';
  const i = t.search(/^==+\s*(current |first[- ]team )?(squad|roster)\b[^=]*==+\s*$/im);
  const sec = i < 0 ? '' : t.slice(i, i + 2600);
  console.log(`\n######## ${pg.title}\n${sec}`);
}
