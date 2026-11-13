// 13 Nov: the new pairing now decides. What changed in the live feed (fixture names only, no scores)
for (let i = 0; i < 24; i++) {
  const f = await (await fetch('https://kickoff.kiwi/data/feed.json?probe=' + Date.now())).json();
  if (/^new pairing on:/.test(f.diag?.pairTrial || '')) {
    const ev = f.events, ids = {}; for (const e of ev) ids[e.id] = (ids[e.id] || 0) + 1;
    console.log('built', f.generatedAt, 'events', ev.length, 'liveSourceEvents', f.diag.liveSourceEvents, 'duplicate ids', Object.values(ids).filter(n => n > 1).length, '| duplicateIds note:', f.diag.duplicateIds, '| newsFailed:', f.diag.newsFailed || 'none');
    console.log(String(f.diag.pairTrial).split(' || ').length, 'differences from the old rule'); console.log('moved:', f.diag.movedGames || 'none'); console.log('drawCards:', String(f.diag.drawCards || 'none').slice(0, 300));
    // possible doubles: two upcoming cards of one team on one NZ day sharing a side
    const up = ev.filter(e => e.home && e.away && Date.parse(e.startUTC) > Date.now() - 864e5), day = t => new Date(Date.parse(t) + 13 * 36e5).toISOString().slice(0, 10), n = s => String(s).toLowerCase().replace(/[^a-z]/g, '');
    const dbl = []; for (let a = 0; a < up.length; a++) for (let b = a + 1; b < up.length; b++) { const x = up[a], y = up[b]; if (x.sport === y.sport && day(x.startUTC) === day(y.startUTC) && [x.home, x.away].some(p => [y.home, y.away].some(q => n(p) && n(q) && (n(p).includes(n(q)) || n(q).includes(n(p)))))) dbl.push(`${x.id} ${x.home} v ${x.away} ${x.startUTC.slice(5, 16)}${x.timeTBC ? '?' : ''} <> ${y.id} ${y.home} v ${y.away} ${y.startUTC.slice(5, 16)}${y.timeTBC ? '?' : ''}`); }
    console.log('same-day cards sharing a side:', dbl.length); console.log(dbl.slice(0, 40).join('\n'));
    console.log('Tall Blacks/Group E:', ev.filter(e => /Group E/.test(e.stage || '') && /New Zealand/.test(e.home + e.away)).map(e => `${e.home} v ${e.away} ${e.startUTC.slice(0, 16)}`).join(' | '));
    process.exit(0);
  }
  await new Promise(r => setTimeout(r, 45000));
}
console.log('the new pairing is not in the live feed after 18 minutes');
