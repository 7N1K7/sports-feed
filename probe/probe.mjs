// probe 211: US GP check 2 — the feed's log and race card, the race article's edits since 19:30Z and the season
// article's since 21:00Z (with what each added), the race classification as written, TheSportsDB round 18
import fs from 'fs';
const ua = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi) probe' }, L = [];
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
L.push(`feed ${f.generatedAt}`);
L.push('diag.f1Sessions: ' + JSON.stringify(f.diag?.f1Sessions));
L.push('diag.f1SessionsSeen: ' + JSON.stringify(f.diag?.f1SessionsSeen));
L.push('diag.f1Times: ' + JSON.stringify(f.diag?.f1Times));
for (const e of (f.events || []).filter(x => x.team === 'f1' && /-18$/.test(x.id))) {
  L.push(`race card ${e.id} status=${e.status} score? ${!!e.score} summary? ${!!e.summary} link=${e.link || '-'} sessPage=${e.sessPage || '-'}`);
  for (const s of e.sess || []) L.push(`  ${s.n} ${s.t} src=${s.src || '-'}${s.top3 ? ' top3' : ''} ${s.rows ? s.rows.length + ': ' + s.rows.slice(0, 22).map(r => `${r.p}.${r.d}${r.nz ? '(NZ)' : ''}/${r.tm}/${r.t}${r.x ? '/' + r.x : ''}`).join(' ; ') : '-'}`);
}
const edits = async (T, from, n) => {
  const h = await (await fetch(`https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=ids|timestamp|size|comment|user&rvlimit=${n}&rvend=${from}&titles=${encodeURIComponent(T)}`, { headers: ua })).json();
  const revs = h.query?.pages?.[0]?.revisions || [];
  L.push(`\nWIKI EDITS to "${T}" since ${from}: ${revs.length}`);
  for (const rv of revs.slice().reverse()) {
    let ins = '';
    try { const d = await (await fetch(`https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=compare&fromrev=${rv.parentid}&torev=${rv.revid}&prop=diff`, { headers: ua })).json();
      ins = [...String(d.compare?.body || '').matchAll(/<ins[^>]*>([\s\S]*?)<\/ins>|<td class="diff-addedline"[^>]*><div>([\s\S]*?)<\/div>/g)].map(m => (m[1] || m[2] || '').replace(/<[^>]+>/g, '')).join(' … ').replace(/\s+/g, ' '); } catch (e) { ins = 'diff error ' + e.message; }
    L.push(`${rv.timestamp} size=${rv.size} "${String(rv.comment || '').slice(0, 60)}" +${ins.slice(0, 200)}`);
  }
};
await edits('2026 United States Grand Prix', '2026-10-25T19:30:00Z', 150);
await edits('2026 Formula One World Championship', '2026-10-25T21:00:00Z', 40);
const r = await (await fetch(`https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=parse&prop=wikitext&page=${encodeURIComponent('2026 United States Grand Prix')}`, { headers: ua })).json();
const w = String(r.parse?.wikitext || ''), q = w.search(/^===\s*Race classification\s*===/m);
L.push(`\nRACE TABLE at ${q} (comment? ${q >= 0 && w.lastIndexOf('<!--', q) > w.lastIndexOf('-->', q)}):\n` + (q >= 0 ? w.slice(q, q + 2200) : '(none)'));
const t = await (await fetch('https://www.thesportsdb.com/api/v1/json/123/eventsround.php?id=4370&r=18&s=2026', { headers: ua })).json();
for (const e of t.events || []) L.push(`tsdb: ${e.strEvent} lines=${String(e.strResult || '').split('\n').filter(x => /^\s*\d+\.\s/.test(x)).length} ${JSON.stringify(String(e.strResult || '').slice(0, 160))}`);
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
