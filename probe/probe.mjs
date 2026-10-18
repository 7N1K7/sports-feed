const UA = { 'User-Agent': 'sports-feed probe (https://7n1k7.github.io/sports-feed/)' };
const get = async t => { const u = 'https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&format=json&formatversion=2&titles=' + encodeURIComponent(t); const j = await (await fetch(u, { headers: UA })).json(); return j.query.pages[0].revisions?.[0].slots.main.content || ''; };
console.log((await get('Template:NRL2026Ladder')).slice(0, 2500));
