// probe 187: US GP check 1 — the feed's log, Wikipedia's edits since 17:00Z (with what each added), TheSportsDB round 18
import fs from 'fs';
const ua = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi) probe' }, L = [];
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
L.push('diag.f1Sessions: ' + JSON.stringify(f.diag?.f1Sessions));
L.push('diag.f1SessionsSeen: ' + JSON.stringify(f.diag?.f1SessionsSeen));
for (const e of (f.events || []).filter(x => x.sess)) for (const s of e.sess) L.push(`  ${s.n} ${s.t} src=${s.src || '-'}${s.top3 ? ' top3' : ''} ${s.rows ? s.rows.length + ': ' + s.rows.slice(0, 12).map(r => `${r.p}.${r.d}${r.nz ? '(NZ)' : ''}/${r.tm}/${r.t}${r.x ? '/' + r.x : ''}`).join(' ; ') : '-'}`);
const T = '2026 United States Grand Prix';
const h = await (await fetch(`https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=ids|timestamp|size|comment|user&rvlimit=100&rvend=2026-10-24T17:00:00Z&titles=${encodeURIComponent(T)}`, { headers: ua })).json();
const revs = h.query?.pages?.[0]?.revisions || [];
L.push(`\nWIKI EDITS since 17:00Z: ${revs.length}`);
for (const rv of revs.slice().reverse()) {
  let ins = '';
  try { const d = await (await fetch(`https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=compare&fromrev=${rv.parentid}&torev=${rv.revid}&prop=diff`, { headers: ua })).json();
    ins = [...String(d.compare?.body || '').matchAll(/<ins[^>]*>([\s\S]*?)<\/ins>|<td class="diff-addedline"[^>]*><div>([\s\S]*?)<\/div>/g)].map(m => (m[1] || m[2] || '').replace(/<[^>]+>/g, '')).join(' … ').replace(/\s+/g, ' '); } catch (e) { ins = 'diff error ' + e.message; }
  L.push(`${rv.timestamp} size=${rv.size} "${String(rv.comment || '').slice(0, 60)}" +${ins.slice(0, 260)}`);
}
const r = await (await fetch(`https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=parse&prop=wikitext&page=${encodeURIComponent(T)}`, { headers: ua })).json();
const w = String(r.parse?.wikitext || ''), i = w.search(/^==\s*(Free )?practice\s*==\s*$/im);
L.push('\nPRACTICE SECTION NOW:\n' + w.slice(i, i + 1400));
const q = w.search(/^===\s*Qualifying classification\s*===/m);
L.push('\nQUALI TABLE START (comment? ' + (w.lastIndexOf('<!--', q) > w.lastIndexOf('-->', q)) + '):\n' + w.slice(q, q + 1500));
const t = await (await fetch('https://www.thesportsdb.com/api/v1/json/123/eventsround.php?id=4370&r=18&s=2026', { headers: ua })).json();
for (const e of t.events || []) L.push(`tsdb: ${e.strEvent} lines=${String(e.strResult || '').split('\n').filter(x => /^\s*\d+\.\s/.test(x)).length} ${JSON.stringify(String(e.strResult || '').slice(0, 160))}`);
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
