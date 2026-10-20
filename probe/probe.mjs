// probe 64: free logos for the Western Australia and South Australia cricket sides: Commons categories and searches,
// Wikidata's logo property, and TheSportsDB under other names
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = async u => { await sleep(1200); const r = await fetch(u, { headers: UA }); return r.ok ? r.json() : { err: r.status }; };
const commons = q => get('https://commons.wikimedia.org/w/api.php?format=json&formatversion=2&' + q);
for (const cat of ['Western Australia cricket team', 'South Australia cricket team', 'Western Australian Cricket Association', 'South Australian Cricket Association', 'Cricket in Western Australia', 'Cricket in South Australia', 'Cricket logos', 'Logos of cricket teams', 'Sport logos of Australia', 'Logos of sports teams of Australia']) {
  const r = await commons('action=query&list=categorymembers&cmlimit=100&cmtype=file|subcat&cmtitle=' + encodeURIComponent('Category:' + cat));
  const xs = (r.query?.categorymembers || []).map(x => x.title);
  console.log(`category "${cat}": ${xs.length} | ` + xs.filter(t => /logo|badge|crest|emblem|Category:/i.test(t) || /warrior|redback|waca|saca|western|south aus/i.test(t)).slice(0, 25).join(' | '));
}
for (const q of ['Western Warriors logo', 'WACA logo cricket', 'Western Australia cricket logo svg', 'Redbacks cricket logo', 'South Australia Redbacks logo', 'SACA logo', 'West End Redbacks', 'Western Fury logo', 'South Australian Scorpions logo', 'Cricket Australia state logo']) {
  const r = await commons('action=query&list=search&srnamespace=6&srlimit=10&srsearch=' + encodeURIComponent(q));
  console.log(`commons search "${q}": ` + ((r.query?.search || []).map(x => x.title).filter(t => !/\.pdf$/i.test(t)).join(' | ') || 'none'));
}
// Wikidata: the team items' logo (P154) and image (P18)
const wd = await get('https://www.wikidata.org/w/api.php?format=json&action=wbgetentities&sites=enwiki&props=claims&titles=' + encodeURIComponent('Western Australia cricket team|South Australia cricket team|Queensland cricket team|Western Australian Cricket Association|South Australian Cricket Association'));
for (const [id, e] of Object.entries(wd.entities || {})) {
  const v = p => (e.claims?.[p] || []).map(c => c.mainsnak?.datavalue?.value).filter(Boolean).join(', ');
  console.log(`wikidata ${id}: logo ${v('P154') || '-'} | image ${v('P18') || '-'}`);
}
// TheSportsDB under other names
for (const q of ['Western Warriors', 'Western Australia Warriors', 'WA Warriors', 'Redbacks', 'West End Redbacks', 'South Australia Redbacks', 'Western Fury', 'Southern Scorpions', 'South Australian Scorpions', 'Western Australia', 'South Australia']) {
  await sleep(2500);
  const r = await get('https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=' + encodeURIComponent(q));
  console.log(`tsdb "${q}": ` + (r.err || (r.teams || []).filter(t => t.strSport === 'Cricket').map(t => `${t.strTeam} [${t.strLeague}] badge ${t.strBadge ? 'YES' : 'no'}`).join('; ') || 'no cricket team'));
}
