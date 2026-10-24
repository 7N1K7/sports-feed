import fs from 'fs';
const L = [];
const p = (...a) => L.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '));
const ua = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi) probe' };
const j = async u => { const r = await fetch(u, { headers: ua }); if (!r.ok) throw new Error(r.status + ' ' + u); return r.json(); };
const t = async u => { const r = await fetch(u, { headers: ua }); return [r.status, await r.text()]; };
const T = 'https://www.thesportsdb.com/api/v1/json/123/';
// 1. TheSportsDB: this weekend (round 18) and the last sprint weekend (17), and results for each session
for (const r of [17, 18]) {
  try {
    const d = await j(`${T}eventsround.php?id=4370&r=${r}&s=2026`);
    p(`== TSDB round ${r}: ${(d.events || []).length} events`);
    for (const ev of d.events || []) {
      p(ev.idEvent, ev.strEvent, ev.strTimestamp, 'status=' + ev.strStatus, 'updated=' + ev.dateEventLocal, 'result=' + String(ev.strResult || '').slice(0, 160).replace(/\s+/g, ' '));
      try {
        const x = await j(`${T}eventresults.php?id=${ev.idEvent}`);
        const rs = x.results || [];
        p('   eventresults:', rs.length, rs[0] ? Object.keys(rs[0]).join(',') : '', rs.slice(0, 3).map(r => [r.intPosition, r.strPlayer, r.strDetail, r.strResult, r.intPoints]));
      } catch (e) { p('   eventresults error', e.message); }
    }
  } catch (e) { p('TSDB', r, e.message); }
}
// 2. Wikipedia: what this weekend's article and the Singapore (sprint) article carry, and how fast the race was written up
const W = 'https://en.wikipedia.org/w/api.php?format=json&formatversion=2&';
for (const title of ['2026 United States Grand Prix', '2026 Singapore Grand Prix', '2026 Mexico City Grand Prix']) {
  try {
    const s = await j(`${W}action=parse&prop=sections&redirects=1&page=${encodeURIComponent(title)}`);
    p(`== Wikipedia ${title}:`, (s.parse?.sections || []).map(x => x.line).join(' | ') || s.error?.info);
  } catch (e) { p(title, e.message); }
}
try {
  const r = await j(`${W}action=query&prop=revisions&rvprop=timestamp|size&rvlimit=60&rvstart=2026-10-12T00:00:00Z&rvend=2026-10-11T10:00:00Z&titles=${encodeURIComponent('2026 Singapore Grand Prix')}`);
  p('== Singapore article edits, race day (newest first):', (r.query.pages[0].revisions || []).map(x => x.timestamp.slice(5, 16) + ' ' + x.size).join(', '));
} catch (e) { p('revs', e.message); }
try {
  const r = await j(`${W}action=parse&prop=wikitext&redirects=1&page=${encodeURIComponent('2026 Singapore Grand Prix')}`);
  const w = r.parse?.wikitext || '';
  for (const h of ['Practice', 'Sprint qualifying', 'Sprint', 'Qualifying']) { const i = w.search(new RegExp(`===?\\s*${h}`, 'i')); p(`-- ${h} section:`, i < 0 ? 'none' : w.slice(i, i + 500).replace(/\n/g, ' ⏎ ')); }
} catch (e) { p('wt', e.message); }
// 3. Terms of the open F1 APIs
for (const [n, u] of [['jolpica README', 'https://raw.githubusercontent.com/jolpica/jolpica-f1/main/README.md'], ['jolpica docs', 'https://raw.githubusercontent.com/jolpica/jolpica-f1/main/docs/README.md'], ['openf1', 'https://openf1.org/'], ['jolpica api', 'https://api.jolpi.ca/ergast/f1/2026/18/results.json']]) {
  try {
    const [st, x] = await t(u);
    const hits = x.split(/\n|(?<=\.)\s/).filter(l => /licen|terms|commercial|attribut|fair use|real.?time|paid|sponsor|subscri|delay|update|not affiliated|trademark/i.test(l)).slice(0, 14).map(l => l.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220));
    p(`== ${n} (${st}, ${x.length} chars)`); for (const h of hits) p('   ', h);
    if (n === 'jolpica api') p('   ', x.slice(0, 400));
  } catch (e) { p(n, e.message); }
}
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n'));
