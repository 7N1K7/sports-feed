// probe 70: Western Australia and South Australia cricket logos under their nicknames (TheSportsDB, Commons)
const sleep = ms => new Promise(r => setTimeout(r, ms));
const UA = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi)' };
for (const q of ['Western Australia', 'Western Warriors', 'WA Warriors', 'Western Australia Cricket', 'South Australia', 'Southern Redbacks', 'West End Redbacks', 'SA Redbacks', 'Redbacks', 'South Australia Cricket']) {
  await sleep(2500);
  const r = await fetch('https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=' + encodeURIComponent(q)); const d = r.ok ? await r.json() : { err: r.status };
  console.log(`tsdb "${q}":`, d.err || (d.teams || []).map(t => `${t.strTeam} [${t.strSport}/${t.strLeague}] badge ${t.strBadge ? 'YES' : 'no'}`).join('; ') || 'none');
}
const titles = new Set();
for (const q of ['Western Australia cricket logo', 'Western Warriors logo', 'WACA logo', 'Western Australia Cricket Association', 'South Australia cricket logo', 'Redbacks cricket logo', 'South Australian Cricket Association logo', 'SACA logo']) {
  const r = await fetch('https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srlimit=10&format=json&srsearch=' + encodeURIComponent(q), { headers: UA }); const d = r.ok ? await r.json() : {};
  (d.query?.search || []).forEach(x => titles.add(x.title));
}
const list = [...titles].filter(t => /cricket|waca|saca|warriors|redbacks|western australia|south australia/i.test(t));
for (let i = 0; i < list.length; i += 20) {
  const r = await fetch('https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|extmetadata&format=json&titles=' + encodeURIComponent(list.slice(i, i + 20).join('|')), { headers: UA }); const d = r.ok ? await r.json() : {};
  for (const p of Object.values(d.query?.pages || {})) { const m = p.imageinfo?.[0]?.extmetadata || {}; console.log('commons', p.title, '|', m.LicenseShortName?.value || '?'); }
}
// Wikidata: logo (P154) on the two teams and their associations
for (const q of ['Western Australia cricket team', 'Western Australian Cricket Association', 'South Australia cricket team', 'South Australian Cricket Association']) {
  const r = await fetch('https://www.wikidata.org/w/api.php?action=wbsearchentities&language=en&format=json&search=' + encodeURIComponent(q), { headers: UA }); const d = r.ok ? await r.json() : {};
  for (const e of (d.search || []).slice(0, 2)) { const c = await (await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${e.id}.json`, { headers: UA })).json(); const cl = c.entities?.[e.id]?.claims || {}; console.log('wikidata', e.id, e.label, '| logo', (cl.P154 || []).map(x => x.mainsnak.datavalue?.value).join(', ') || '-'); }
}
