// probe 137: how the netball sides' pages set out their current squads
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const j = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent('New Zealand national netball team|Australia national netball team'), { headers: UA })).json();
for (const p of j.query?.pages || []) { const c = p.revisions?.[0]?.slots?.main?.content || '';
  const i = c.search(/^===\s*Current squad\s*===/m);
  console.log(`\n##### ${p.title}\n` + c.slice(i, i + 3500)); }
