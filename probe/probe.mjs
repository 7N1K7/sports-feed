// daily check, 20 Nov: which Plunket Shield and Hallyburton Johnstone Shield games does Wikipedia list? Dates, sides and grounds only; digits in results masked.
import { writeFileSync } from 'node:fs';
const out = []; process.on('exit', () => writeFileSync('probe/out.txt', out.join('\n') + '\n'));
const wait = ms => new Promise(r => setTimeout(r, ms));
for (const title of ['2026–27 Plunket Shield season', '2026–27 Hallyburton Johnstone Shield']) {
  try {
    const r = await fetch('https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content|timestamp&rvslots=main&format=json&formatversion=2&redirects=1&titles=' + encodeURIComponent(title), { headers: { 'user-agent': 'kickoff-kiwi-probe (github.com/7N1K7/sports-feed)' } });
    const j = await r.json(); const pg = j.query.pages[0]; const text = pg.revisions?.[0]?.slots?.main?.content || '';
    out.push(`== ${pg.title}: ${r.status}, ${text.length} chars, last edit ${pg.revisions?.[0]?.timestamp}${pg.missing ? ' MISSING' : ''}`);
    out.push('headings: ' + [...text.matchAll(/^(={2,4})\s*([^=\n]+?)\s*\1\s*$/gm)].map(m => m[2]).join(' / ').slice(0, 600));
    const re = /\{\{\s*(Single-innings cricket match|Two-innings cricket match|Limited overs matches|Test match|Cricket match summary)/gi; let m; const starts = [];
    while ((m = re.exec(text))) starts.push([m.index, m[1]]);
    out.push(`match boxes ${starts.length}`);
    for (const [at, kind] of starts) { const body = text.slice(at, at + 2500); const g = k => ((body.match(new RegExp('\\|[ \\t]*' + k + '[ \\t]*=[ \\t]*([^\\n]*)')) || [])[1] || '').trim();
      const head = [...text.slice(0, at).matchAll(/^(={2,4})\s*([^=\n]+?)\s*\1\s*$/gm)].pop()?.[2] || '';
      out.push(`${head} | ${g('date')} | ${g('team1')} v ${g('team2')} | ${g('venue')} | time: ${g('time')} | result filled ${!!g('result')} | notes: ${g('notes').replace(/\d/g, '#').slice(0, 60)}`.slice(0, 330)); }
    const tables = [...text.matchAll(/\{\|[^\n]*wikitable[\s\S]*?\|\}/g)].map(t => t[0]);
    out.push(`tables ${tables.length}: ` + tables.map(t => t.split('\n').slice(0, 14).join(' ⏎ ').replace(/\d{2,}/g, '#').slice(0, 500)).join('\n  -- '));
  } catch (e) { out.push('error ' + title + ': ' + String(e.message).slice(0, 200)); }
  await wait(1500);
}
