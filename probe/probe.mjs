// probe 68: TheSportsDB names for the S.E. Melbourne Phoenix and Central Hinds
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const q of ['South East Melbourne Phoenix', 'S.E. Melbourne Phoenix', 'SE Melbourne Phoenix', 'Melbourne Phoenix', 'Central Hinds', 'Central Districts Hinds', 'Central Stags']) {
  await sleep(2500);
  const r = await fetch('https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=' + encodeURIComponent(q)); const d = r.ok ? await r.json() : { err: r.status };
  console.log(`"${q}":`, d.err || (d.teams || []).map(t => `${t.strTeam} [${t.strSport}/${t.strLeague}] badge ${t.strBadge ? 'YES' : 'no'}`).join('; ') || 'none');
}
