// probe 49: the Australian state cricket team pages: where the current squad is and what its wikitext looks like
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
for (const page of ['Queensland cricket team', 'New South Wales cricket team', 'Victoria cricket team', 'South Australia cricket team', 'Western Australia cricket team', 'Tasmania cricket team']) {
  const r = await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(page), { headers: UA });
  const j = await r.json(), pg = j.query?.pages?.[0], text = pg?.revisions?.[0]?.slots?.main?.content || '';
  const heads = [...text.matchAll(/^(==+)\s*([^=]+?)\s*\1\s*$/gm)].map(m => m[1].length + ':' + m[2]);
  console.log('\n==', page, '->', pg?.title, '|', text.length, 'chars | headings:', heads.join(' / '));
  const i = text.search(/^==+\s*(Current squad|Squad|Current playing squad|Players)\s*==+/im);
  if (i >= 0) console.log(text.slice(i, i + 2600));
  await new Promise(r => setTimeout(r, 1200));
}
