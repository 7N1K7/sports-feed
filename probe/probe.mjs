const UA = { 'User-Agent': 'sports-feed probe (https://7n1k7.github.io/sports-feed/)' };
const get = async t => { const u = 'https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&format=json&formatversion=2&titles=' + encodeURIComponent(t); const j = await (await fetch(u, { headers: UA })).json(); return j.query.pages[0].revisions?.[0].slots.main.content || ''; };
for (const t of ['Indian cricket team in New Zealand in 2026–27', 'New Zealand women\'s cricket team in Australia in 2026–27', 'Sri Lankan cricket team in New Zealand in 2026–27', 'Indian cricket team in New Zealand in 2025–26', 'English cricket team in New Zealand in 2024–25']) {
  const x = await get(t); const i = x.search(/==\s*Squads?\s*==/i);
  console.log('######## ' + t, x.length, i);
  if (i >= 0) console.log(x.slice(i, i + 3500));
}
for (const t of ['2026 Nations Championship', '2026 Men\'s Rugby League World Cup']) {
  const x = await get(t); const i = x.search(/\|\s*FB\s*\|\||'''1'''|Team details|{{rugby union lineup/i);
  console.log('######## ' + t, x.length, i); if (i >= 0) console.log(x.slice(Math.max(0, i - 600), i + 2500));
}
