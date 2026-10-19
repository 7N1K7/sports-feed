// probe 12: what data exists for team and player links (TheSportsDB team fields, Wikidata id properties, squads in the feed)
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const q of ['TheSportsDB team', 'TheSportsDB player', 'All Blacks player', 'ESPN scrum player', 'World Rugby player', 'NRL player', 'Rugby League Project player', 'Sherdog fighter', 'UFC athlete', 'BoxRec boxer', 'Tapology fighter', 'ESPNcricinfo player', 'official website', 'Black Ferns player', 'Super Rugby']) {
  const r = await (await fetch(`https://www.wikidata.org/w/api.php?action=wbsearchentities&type=property&language=en&format=json&limit=4&search=${encodeURIComponent(q)}`, { headers: UA })).json();
  console.log('PROP', q, '=>', (r.search || []).map(p => `${p.id} ${p.label}`).join(' | '));
  await sleep(500);
}
for (const q of ['Crusaders', 'New Zealand Warriors', 'Canterbury', 'Wellington Phoenix', 'Auckland Aces']) {
  const d = await (await fetch('https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=' + encodeURIComponent(q), { headers: UA })).json();
  const t = (d.teams || [])[0];
  if (t) console.log('TSDB', q, '=>', t.strTeam, '|', t.strSport, '|', Object.entries(t).filter(([k, v]) => v && /web|wiki|face|twit|insta|you|idTeam|idWiki|strTeam$/i.test(k)).map(([k, v]) => `${k}=${String(v).slice(0, 70)}`).join(' ; '));
  await sleep(2500);
}
const f = await (await fetch('https://7n1k7.github.io/sports-feed/data/feed.json?x=' + Date.now())).json();
const by = {};
for (const e of f.events) for (const s of e.squads || []) for (const p of s.players || []) { const k = e.sport; by[k] ||= { n: 0, wp: 0, ci: 0, ex: '' }; by[k].n++; if (p.wp) by[k].wp++; if (p.ci) by[k].ci++; if (!by[k].ex) by[k].ex = JSON.stringify(p); }
console.log('SQUADS', JSON.stringify(by));
const ev = f.events.find(e => e.card?.length);
console.log('CARD', JSON.stringify(ev?.card?.[0]));
console.log('version', f.site?.version, 'bbc', f.diag?.bbc, '| rain', f.diag?.rainHeadlines, '| sportmonks', f.diag?.sportmonks);
