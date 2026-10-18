const UA = { 'User-Agent': 'sports-feed probe (https://7n1k7.github.io/sports-feed/)' };
const get = async t => { const u = 'https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&format=json&formatversion=2&titles=' + encodeURIComponent(t); const j = await (await fetch(u, { headers: UA })).json(); return j.query.pages[0].revisions?.[0].slots.main.content || ''; };
const f1 = await get('2026 Formula One World Championship');
let i = f1.search(/==\s*Grands Prix\s*==|Results and standings/i); console.log(f1.slice(i, i + 2600));
const t = await get('Template:F1 Drivers Standings'); console.log('#### DRIVERS', t.length); console.log(t.slice(0, 3500));
const c = await get('Template:F1 Constructors Standings'); console.log('#### CONS', c.length); console.log(c.slice(0, 1500));
const r = await get('2026 United States Grand Prix'); console.log('#### USGP', r.length); i = r.search(/\{\{\s*Infobox/i); console.log(r.slice(i, i + 1200));
