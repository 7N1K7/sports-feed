// probe 140: the women's World Cup page's text around Samoa v Wales, and how the feed reads that page
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const j = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent("2026 Women's Rugby League World Cup"), { headers: UA })).json();
const c = j.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content || '';
let shown = 0;
for (const m of c.matchAll(/Wales/g)) { const near = c.slice(Math.max(0, m.index - 500), m.index + 300); if (/Samoa|SAM/.test(near) && /time|date/i.test(near) && shown < 2) { console.log('-----\n' + near); shown++; } }
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?t=' + Date.now())).json();
for (const k of Object.keys(f.diag || {})) if (/world cup|rlwc|wiki/i.test(k)) console.log('diag', k, JSON.stringify(f.diag[k]).slice(0, 200));
