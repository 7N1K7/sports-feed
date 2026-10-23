// probe 138: where Samoa v Wales (women's league World Cup) got its kick-off time
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?t=' + Date.now())).json();
for (const e of (f.events || []).filter(e => /Samoa/.test(`${e.home} ${e.away}`) && /Wales/.test(`${e.home} ${e.away}`))) {
  const { squads, card, ...rest } = e; console.log(JSON.stringify(rest).slice(0, 1500)); }
const j = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent("2026 Women's Rugby League World Cup"), { headers: UA })).json();
const c = j.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content || '';
const i = c.search(/Samoa[^\n]*\n?[^\n]*Wales|Wales[^\n]*\n?[^\n]*Samoa/);
let k = c.indexOf('{{', Math.max(0, c.lastIndexOf('{{Rugby league', i) >= 0 ? c.lastIndexOf('{{Rugby league', i) : i - 600));
console.log('\nwiki around the match:\n' + c.slice(Math.max(0, i - 700), i + 900));
