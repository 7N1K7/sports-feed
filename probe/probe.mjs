// probe 139: Samoa v Wales (women) in Wikipedia's match boxes and on TheSportsDB
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const j = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent("2026 Women's Rugby League World Cup|2026 Women's Rugby League World Cup Group A"), { headers: UA })).json();
for (const p of j.query?.pages || []) { const c = p.revisions?.[0]?.slots?.main?.content || '';
  console.log(`##### ${p.title}${p.missing ? ' MISSING' : ''} ${c.length}`);
  for (const m of c.matchAll(/\{\{\s*(?:Rugby ?league ?box|RLbox|rugbyleaguebox)[\s\S]*?\n\}\}/gi)) if (/Samoa/.test(m[0]) && /Wales/.test(m[0])) console.log(m[0].slice(0, 900)); }
const r = await fetch('https://www.thesportsdb.com/api/v1/json/123/searchevents.php?e=' + encodeURIComponent('Samoa vs Wales') + '&s=2026');
const t = await r.json().catch(() => ({}));
console.log('\ntsdb:', (t.event || []).map(e => `${e.strEvent} | ${e.strLeague} | ${e.dateEvent} ${e.strTime} | ${e.strTimestamp}`).join('\n'));
