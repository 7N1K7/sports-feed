// probe 66: TheSportsDB's NBL and netball team lists (badges), and Wikidata logos (P154) for teams still missing one
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T = 'https://www.thesportsdb.com/api/v1/json/123/';
for (const l of ['Australian NBL', 'NBL', 'Australian National Basketball League', 'ANZ Premiership', 'Suncorp Super Netball', 'New Zealand Netball']) {
  await sleep(2500);
  const r = await fetch(T + 'search_all_teams.php?l=' + encodeURIComponent(l)); const d = r.ok ? await r.json() : { err: r.status };
  console.log(`tsdb league "${l}":`, d.err || (d.teams || []).map(t => `${t.strTeam}${t.strBadge ? '*' : ''}`).join(', ') || 'none');
}
for (const q of ['New Zealand Breakers', 'Northern Mystics', 'Central Pulse', 'Central Hinds']) {
  await sleep(2500);
  const r = await fetch(T + 'searchteams.php?t=' + encodeURIComponent(q)); const d = r.ok ? await r.json() : { err: r.status };
  console.log(`tsdb team "${q}":`, d.err || (d.teams || []).map(t => `${t.strTeam} [${t.strSport}/${t.strLeague}]${t.strBadge ? '*' : ''}`).join('; ') || 'none');
}
// Wikidata logos for a spread of teams, and whether each file is on Commons (free) or not
const titles = ['New Zealand Breakers', 'Cairns Taipans', 'Perth Wildcats', 'Central Hinds', 'United States national rugby union team', 'Western Australia cricket team', 'Northern Mystics', 'Wellington Phoenix FC', 'Canterbury Kings', 'Otago Volts', 'Hurricanes (rugby union)'];
await sleep(1000);
const wd = await (await fetch('https://www.wikidata.org/w/api.php?format=json&action=wbgetentities&sites=enwiki&props=claims|sitelinks&sitefilter=enwiki&titles=' + encodeURIComponent(titles.join('|')), { headers: UA })).json();
const files = [];
for (const e of Object.values(wd.entities || {})) {
  const logo = (e.claims?.P154 || []).map(c => c.mainsnak?.datavalue?.value).filter(Boolean);
  files.push(...logo);
  console.log(`wikidata ${e.sitelinks?.enwiki?.title || e.id}: logo ${logo.join(', ') || '-'}`);
}
if (files.length) {
  await sleep(1000);
  const ii = await (await fetch('https://commons.wikimedia.org/w/api.php?format=json&formatversion=2&action=query&prop=imageinfo&iiprop=extmetadata&titles=' + encodeURIComponent(files.map(f => 'File:' + f).join('|')), { headers: UA })).json();
  for (const pg of ii.query?.pages || []) console.log(`  ${pg.title}: ${pg.missing ? 'not on Commons' : (pg.imageinfo?.[0]?.extmetadata?.LicenseShortName?.value || '?')}`);
}
