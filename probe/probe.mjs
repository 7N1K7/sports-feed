// probe 142: the netball sides' current squad templates
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const j = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent('Template:New Zealand national netball team current squad|Template:Australia national netball team current squad'), { headers: UA })).json();
for (const p of j.query?.pages || []) { const c = p.revisions?.[0]?.slots?.main?.content || ''; console.log(`\n##### ${p.title}${p.missing ? ' MISSING' : ''} ${c.length}\n` + c.slice(0, 2500)); }
