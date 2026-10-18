// F1 probe 2: constructors standings rows, Lawson's row, TheSportsDB endpoints for one race weekend
const UA = { 'User-Agent': 'sports-feed probe (https://7n1k7.github.io/sports-feed/)' };
const get = async t => { const u = 'https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&format=json&formatversion=2&titles=' + encodeURIComponent(t); const j = await (await fetch(u, { headers: UA })).json(); return j.query.pages[0].revisions?.[0].slots.main.content || ''; };
const c = await get('Template:F1 Constructors Standings');
let i = c.indexOf('\n|-'); console.log('#### CONS ROWS'); console.log(c.slice(i, i + 7000));
console.log('#### CONS TAIL'); console.log(c.slice(-2500));
const d = await get('Template:F1 Drivers Standings');
i = d.indexOf('Liam Lawson'); console.log('#### LAWSON'); console.log(d.slice(i - 200, i + 300));
console.log('#### DRIVERS TAIL'); console.log(d.slice(-2000));
const T = 'https://www.thesportsdb.com/api/v1/json/123/';
for (const q of ['eventsround.php?id=4370&r=18&s=2026', 'searchevents.php?e=United%20States%20Grand%20Prix&s=2026', 'eventsday.php?d=2026-10-25&l=4370']) {
  try {
    const r = await fetch(T + q, { headers: UA });
    const j = await r.json();
    const evs = j.events || j.event || [];
    console.log('#### TSDB', q, r.status, evs.length);
    for (const e of evs) console.log([e.idEvent, e.strEvent, e.dateEvent, e.strTime, e.strTimestamp, e.strVenue, e.strCity, e.intRound, e.strStatus, e.idLeague].join(' | '));
  } catch (e) { console.log('#### TSDB', q, 'error', e.message); }
  await new Promise(r => setTimeout(r, 7000));
}
