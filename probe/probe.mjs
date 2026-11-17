const UA = { headers: { 'user-agent': 'kickoff-kiwi-probe/1.0' } };
const raw = async t => { const r = await fetch('https://en.wikipedia.org/w/index.php?action=raw&redirect=yes&title=' + encodeURIComponent(t), UA); return r.ok ? r.text() : ''; };
const sec = (x, h, n = 2600) => { const i = x.search(new RegExp('^=+\\s*' + h + '\\s*=+\\s*$', 'm')); return i < 0 ? '(no section ' + h + ')' : x.slice(i, i + n); };
let x = await raw('2027 NASCAR Cup Series');
console.log('##### 2027 schedule full\n' + sec(x, 'Schedule', 14000));
console.log('##### 2027 race results\n' + sec(x, 'Race results', 1800));
x = await raw('2026 NASCAR Cup Series');
console.log('##### 2026 race results\n' + sec(x, 'Race results', 2600));
for (const u of ['eventsround.php?id=4393&r=1&s=2026', 'eventsround.php?id=4393&r=30&s=2026', 'eventsround.php?id=4393&r=1&s=2027', 'eventsnextleague.php?id=4393']) {
  try { const j = await (await fetch('https://www.thesportsdb.com/api/v1/json/123/' + u)).json();
    console.log('TSDB', u, (j.events || []).length, (j.events || []).slice(0, 5).map(e => `r${e.intRound} ${e.strTimestamp} ${e.strEvent} @ ${e.strVenue} res:${(e.strResult || '').length}`).join(' ; '));
  } catch (e) { console.log('TSDB', u, 'error', e.message); }
}
