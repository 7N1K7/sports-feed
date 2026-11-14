// 15 Nov, the daily check (4): the raw Wikipedia blocks the reader takes no score from (Ford Trophy 8 Nov, WBBL 14 Nov)
const UA = { 'user-agent': 'sports-fixture-check/1.0 (fixture times; contact via site)' };
const raw = async t => { const r = await fetch('https://en.wikipedia.org/w/index.php?action=raw&title=' + encodeURIComponent(t), { headers: UA }); return r.ok ? await r.text() : ''; };
console.log('DAILY15D');
for (const [t, date, n] of [["2026–27 Women's Big Bash League season", /14 November/, 1], ['2026–27 Ford Trophy', /(8|12) November/, 2], ['2026–27 Ford Trophy', /28 October/, 1]]) {
  const w = await raw(t);
  const blocks = w.split(/\{\{(?=Single-innings cricket match|Limited overs matches|Two-innings cricket match)/i).slice(1).filter(b => date.test((b.match(/\|\s*date\s*=\s*([^\n]*)/) || [, ''])[1]));
  for (const b of blocks.slice(0, n)) console.log('== ' + t + '\n' + JSON.stringify(b.slice(0, 700)));
}
