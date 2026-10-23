// probe 124: roster templates for NBA, MLB and NPB sides (raw wikitext samples), and the team names the live feed uses
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
let f = { events: [] };
try { f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json(); } catch (e) { console.log('feed error', e.message); }
const names = sp => [...new Set(f.events.filter(sp).flatMap(e => [e.home, e.away]).filter(Boolean))];
const nba = names(e => e.team === 'nba'), mlb = names(e => e.comp === 'MLB playoffs'), npb = names(e => e.comp === 'Japan Series');
console.log('site', JSON.stringify(f.site || {}).slice(0, 80));
console.log('NBA names', nba.length, nba.join(', '));
console.log('MLB names', mlb.join(', '));
console.log('NPB names', npb.join(', '));
const raw = async t => { const r = await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(t.join('|')), { headers: UA });
  const j = await r.json(); return Object.fromEntries((j.query?.pages || []).map(p => [p.title, p.missing ? null : p.revisions?.[0]?.slots?.main?.content || ''])); };
const tpl = n => `Template:${n.replace(/^LA /, 'Los Angeles ')} roster`;
for (const [label, list] of [['NBA', nba], ['MLB', mlb], ['NPB', npb]]) {
  const got = {};
  for (let i = 0; i < list.length; i += 40) Object.assign(got, await raw(list.slice(i, i + 40).map(tpl)));
  console.log(`\n== ${label}: ${Object.values(got).filter(Boolean).length} of ${list.length} templates found; missing: ${list.filter(n => !got[tpl(n)]).join(', ')}`);
  const first = Object.entries(got).find(([, v]) => v);
  if (first) { console.log('--- sample', first[0], first[1].length, 'chars'); console.log(first[1].slice(0, 3200)); }
  // template names used inside, and how many of each, across all of them
  const counts = {};
  for (const v of Object.values(got).filter(Boolean)) for (const m of v.matchAll(/\{\{\s*([^|}\n]+?)\s*[|}]/g)) counts[m[1]] = (counts[m[1]] || 0) + 1;
  console.log('--- templates used:', Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, n]) => `${k} ${n}`).join(' | '));
  await new Promise(r => setTimeout(r, 1000));
}
