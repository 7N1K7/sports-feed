// probe 91: TheSportsDB Supercars league art; ATP doubles top rows as wikitext (find the table's source)
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const s = await (await fetch('https://www.thesportsdb.com/api/v1/json/123/search_all_leagues.php?s=Motorsport')).json();
for (const l of (s.countries || s.leagues || []).filter(l => /supercar|v8|formula 1/i.test(l.strLeague))) console.log(l.idLeague, l.strLeague, '| badge', l.strBadge, '| logo', l.strLogo);
const q = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&titles=ATP_rankings', { headers: UA })).json();
const t = q.query.pages[0].revisions[0].slots.main.content;
for (const m of t.matchAll(/doubles\)?[^\n]{0,40}as of/gi)) console.log('at', m.index, JSON.stringify(t.slice(m.index - 100, m.index + 120)));
const i = t.search(/\{\{\s*Top ten doubles|rankings \(doubles\)/i); console.log(t.slice(i, i + 1800));
