// probe 222: did the race or qualifying order change after it first went up? Each "classification" edit's tables
// against the one before (cells that changed, by position), from the race's first full table on
import fs from 'fs';
import * as m from './sources.mjs';
const ua = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi) probe' }, L = [], title = '2026 United States Grand Prix';
const rv = await (await fetch(`https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&titles=${encodeURIComponent(title)}&rvprop=ids|timestamp|comment&rvlimit=60&rvend=2026-10-25T23:00:00Z&rvdir=older`, { headers: ua })).json();
const revs = (rv.query.pages[0].revisions || []).reverse();
let prev = null;
for (const r of revs) {
  const w = (await (await fetch(`https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=parse&prop=wikitext&oldid=${r.revid}`, { headers: ua })).json()).parse.wikitext.replace(/<!--[\s\S]*?-->/g, '');
  const t = m._f1Tables(w), out = [];
  for (const n of ['Qualifying', 'Race']) {
    const a = prev?.[n] || [], b = t[n] || [];
    if (!prev) { out.push(`${n} ${b.length} rows`); continue; }
    const ch = b.map((x, i) => ['p', 'd', 'tm', 't', 'x'].filter(k => String(x[k] || '') !== String(a[i]?.[k] || '')).map(k => `P${i + 1}.${k}${k === 't' || k === 'x' || k === 'p' ? `(${a[i]?.[k] || ''}→${x[k] || ''})` : ''}`).join(',')).filter(Boolean);
    if (ch.length || a.length !== b.length) out.push(`${n}: ${a.length}→${b.length} rows; ${ch.join(' ') || 'same cells'}`);
  }
  L.push(`${r.timestamp} ${out.join(' | ') || 'no change in either table'}`);
  prev = t;
}
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
