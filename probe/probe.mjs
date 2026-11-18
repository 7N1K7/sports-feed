// daily check, 19 Nov: does Wikipedia have the Dean Jones Trophy games of 16 Nov and the WBBL game of 17 Nov yet? Digits in results masked.
import { writeFileSync } from 'node:fs';
const out = []; process.on('exit', () => writeFileSync('probe/out.txt', out.join('\n') + '\n'));
const wait = ms => new Promise(r => setTimeout(r, ms));
for (const [title, want] of [['2026–27 Dean Jones Trophy', /1[4-7] November/], ["2026–27 Women's Big Bash League season", /1[5-8] November/]]) {
  try {
    const r = await fetch('https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content|timestamp&rvslots=main&format=json&formatversion=2&titles=' + encodeURIComponent(title), { headers: { 'user-agent': 'kickoff-kiwi-probe (github.com/7N1K7/sports-feed)' } });
    const j = await r.json(); const pg = j.query.pages[0]; const text = pg.revisions?.[0]?.slots?.main?.content || '';
    out.push(`== ${title}: ${r.status}, ${text.length} chars, last edit ${pg.revisions?.[0]?.timestamp}`);
    const boxes = text.split(/\{\{\s*(?:Single-innings cricket match|Limited overs matches|Cricket match summary)/i).slice(1);
    out.push(`boxes ${boxes.length}`);
    for (const b of boxes) { const body = b.slice(0, 1500); const date = (body.match(/\|\s*date\s*=\s*([^\n|]*)/) || [])[1] || '';
      if (!want.test(date)) continue;
      const g = k => ((body.match(new RegExp('\\|\\s*' + k + '\\s*=\\s*([^\\n]*)')) || [])[1] || '').replace(/\d/g, '#').slice(0, 90);
      out.push(`${date.slice(0, 40)} | ${g('team1').slice(0, 40)} v ${g('team2').slice(0, 40)} | score1 filled ${!!g('score1').trim()} | result: ${g('result')} | notes: ${g('notes').slice(0, 60)} | rain: ${g('rain')}`); }
  } catch (e) { out.push('error ' + title + ': ' + String(e.message).slice(0, 200)); }
  await wait(1500);
}
