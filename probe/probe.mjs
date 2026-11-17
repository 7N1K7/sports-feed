const f = await (await fetch('https://kickoff.kiwi/data/feed.json?y=' + Date.now())).json();
console.log('feed', f.generatedAt, 'events', f.events.length, 'diag sevens:', f.diag?.sevens, '| cup:', f.diag?.americascup);
for (const e of f.events.filter(e => e.team === 'sevens' || e.team === 'americascup')) console.log(e.id, '|', e.home, '|', e.kind, '|', e.openUTC?.slice(0, 16), e.startUTC.slice(0, 16), '|', e.status, '|', e.broadcast || '-', '|', e.watchRule ? 'rule' : '', '|', e.au || '');
for (const k of ['sevens', 'americascup']) { const r = await fetch(`https://kickoff.kiwi/data/cal/${k}.ics?y=` + Date.now()); const x = r.ok ? await r.text() : ''; console.log('cal', k, r.status, 'events', (x.match(/BEGIN:VEVENT/g) || []).length, (x.match(/SUMMARY:(.*)/) || [])[1] || ''); }
const p = await (await fetch('https://kickoff.kiwi/?y=' + Date.now())).text(); console.log('page has sevens', /\['sevens','Sevens'\]/.test(p));
// NASCAR on TheSportsDB (free key): does the 2027 season have start times?
for (const u of ['search_all_leagues.php?s=Motorsport', 'eventsseason.php?id=4393&s=2027', 'eventsseason.php?id=4393&s=2026']) {
  try { const r = await fetch('https://www.thesportsdb.com/api/v1/json/123/' + u), j = await r.json();
    if (j.countries || j.leagues) console.log(u, (j.countries || j.leagues).filter(l => /nascar|indy|formula e/i.test(l.strLeague)).map(l => l.idLeague + ' ' + l.strLeague).join(' | '));
    else console.log(u, (j.events || []).length, 'events;', (j.events || []).slice(0, 4).concat((j.events || []).slice(-2)).map(e => `${e.dateEvent} ${e.strTime} ${e.strEvent} @ ${e.strVenue}`).join(' ; '));
  } catch (e) { console.log(u, 'error', e.message); }
}
