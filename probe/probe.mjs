const UA = { 'User-Agent': 'sports-feed probe (https://7n1k7.github.io/sports-feed/)' };
const get = async t => { const u = 'https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&format=json&formatversion=2&titles=' + encodeURIComponent(t); const j = await (await fetch(u, { headers: UA })).json(); return j.query.pages[0].revisions?.[0].slots.main.content || ''; };
const x = await get('2026 NRL season');
console.log(x.length);
for (const m of x.matchAll(/\{\{[^{}\n]{0,120}(ladder|table|standings)[^{}\n]{0,80}\}\}|#invoke:[^\n]{0,80}|==[^=\n]*(ladder|Ladder|table)[^=\n]*==/gi)) console.log(m[0]);
const i = x.search(/ladder/i); console.log(x.slice(i - 300, i + 800));
