// probe 90: Supercars standings table shape; TheSportsDB's Supercars league badge
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const q = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&titles=2026_Supercars_Championship', { headers: UA })).json();
const t = q.query.pages[0].revisions[0].slots.main.content, i = t.search(/===\s*Driver'?s'? Championship\s*===/i);
const sec = t.slice(i, i + 200000); const tbl = (sec.match(/\{\|[\s\S]*?\n\|\}/) || [''])[0];
console.log(tbl.slice(0, 2500)); console.log('... nested tables?', (sec.slice(0, 20000).match(/\{\|/g) || []).length);
const s = await (await fetch('https://www.thesportsdb.com/api/v1/json/3/search_all_leagues.php?s=Motorsport')).json();
for (const l of (s.countries || s.leagues || []).filter(l => /supercar|v8/i.test(l.strLeague))) console.log(l.idLeague, l.strLeague, l.strBadge, l.strLogo);
