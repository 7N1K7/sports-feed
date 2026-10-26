// probe 221: US GP check 3: what TheSportsDB added late, Wikipedia corrections after the race, and our final log
import fs from 'fs';
import * as m from './sources.mjs';
const ua = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi) probe' }, L = [];
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
const e = f.events.find(x => x.id === 'f1-2026-18');
L.push(`feed ${f.generatedAt}\nf1Sessions: ${f.diag?.f1Sessions}\nseen: ${JSON.stringify(f.diag?.f1SessionsSeen)}`);
L.push(`sess: ${(e.sess || []).map(s => `${s.n} ${s.rows ? s.rows.length : 0}${s.top3 ? ' top3' : ''} src=${s.src || '-'}`).join('; ')} | cls ${e.cls?.length || 0}`);
const title = decodeURIComponent((e.link || '').split('/wiki/')[1] || '2026_United_States_Grand_Prix').replace(/_/g, ' ');
const w = (await (await fetch(`https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=parse&prop=wikitext&redirects=1&page=${encodeURIComponent(title)}`, { headers: ua })).json()).parse.wikitext.replace(/<!--[\s\S]*?-->/g, '');
const t = m._f1Tables(w);
for (const n of Object.keys(t)) {
  const ours = n === 'Race' ? e.cls : e.sess?.find(s => s.n === n)?.rows;
  if (!ours) { L.push(`${n}: Wikipedia ${t[n].length} rows, ours none`); continue; }
  const diff = t[n].map((r, i) => { const o = ours[i] || {}; return ['p', 'd', 'tm', 't', 'x'].filter(k => String(r[k] || '') !== String(o[k] || '')).map(k => `P${i + 1}.${k}`).join(','); }).filter(Boolean);
  L.push(`${n}: Wikipedia ${t[n].length} rows, ours ${ours.length}; differing cells: ${diff.join(' ') || 'none'}`);
}
const rv = await (await fetch(`https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&titles=${encodeURIComponent(title)}&rvprop=timestamp|comment|size&rvlimit=60&rvend=2026-10-25T21:30:00Z`, { headers: ua })).json();
const revs = rv.query.pages[0].revisions || [];
L.push(`\n${revs.length} edits since 25 Oct 21:30 (newest first):`); for (const r of revs) L.push(`  ${r.timestamp} ${r.size} ${String(r.comment || '').slice(0, 110)}`);
const d = await (await fetch('https://www.thesportsdb.com/api/v1/json/123/eventsround.php?id=4370&r=18&s=2026', { headers: ua })).json();
L.push('\nTheSportsDB round 18:'); for (const ev of d.events || []) { const res = String(ev.strResult || ''); L.push(`  ${ev.strEvent} | ${ev.strTimestamp} | ${(res.match(/^\s*\d+\.?\s+\S/gm) || []).length} result lines | ${JSON.stringify(res.slice(0, 70))}`); }
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
