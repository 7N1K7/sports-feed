// 15 Nov, the daily check (2): does Wikipedia have Saturday's WBBL and Hallyburton Johnstone Shield games and the Ford
// Trophy's later rounds yet?
const UA = { 'user-agent': 'sports-fixture-check/1.0 (fixture times; contact via site)' };
const raw = async t => { const r = await fetch('https://en.wikipedia.org/w/index.php?action=raw&title=' + encodeURIComponent(t), { headers: UA }); return r.ok ? await r.text() : ''; };
console.log('DAILY15B');
for (const [t, dates] of [["2026–27 Women's Big Bash League season", /1[345] November/], ['2026–27 Hallyburton Johnstone Shield', /1[345] November/], ['2026–27 Ford Trophy', /(8|12|14|15) November/]]) {
  const w = await raw(t); console.log('==', t, w.length, 'chars');
  const blocks = w.split(/\{\{(?=Single-innings cricket match|Limited overs matches|Two-innings cricket match)/i).slice(1);
  let n = 0;
  for (const b of blocks) { const body = b.slice(0, b.indexOf('\n}}') > 0 ? b.indexOf('\n}}') : 1500);
    const g = k => (body.match(new RegExp('\\|\\s*' + k + '\\s*=\\s*([^\\n]*)')) || [, ''])[1].trim().slice(0, 90);
    if (!dates.test(g('date'))) continue; n++;
    console.log(' ', g('date'), '|', g('team1'), 'v', g('team2'), '| score1 given:', !!g('score1'), '| score2 given:', !!g('score2'), '| result given:', !!g('result'), g('result') ? '(' + (/no result|abandon|washed|without a ball/i.test(g('result')) ? 'no play/abandoned' : 'a result') + ')' : ''); }
  console.log('  blocks', blocks.length, 'on those dates', n);
}
