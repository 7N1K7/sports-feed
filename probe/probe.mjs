import fs from 'fs';
const L = [];
const p = (...a) => L.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '));
const ua = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi) probe' };
const j = async u => { const r = await fetch(u, { headers: ua }); if (!r.ok) throw new Error(r.status + ' ' + u); return r.json(); };
const W = 'https://en.wikipedia.org/w/api.php?format=json&formatversion=2&';
try {
  const r = await j(`${W}action=parse&prop=wikitext&redirects=1&page=${encodeURIComponent('2026 United States Grand Prix')}`);
  const w = r.parse?.wikitext || '';
  const i = w.search(/==\s*Practice/i); p('== US GP practice section now:', i < 0 ? 'none' : w.slice(i, i + 900).replace(/\n/g, ' ⏎ '));
} catch (e) { p('wt', e.message); }
try {
  const r = await j(`${W}action=query&prop=revisions&rvprop=timestamp|size|comment&rvlimit=40&rvstart=2026-10-24T03:00:00Z&rvend=2026-10-23T16:00:00Z&titles=${encodeURIComponent('2026 United States Grand Prix')}`);
  p('== US GP edits since FP1 (newest first):'); for (const x of r.query.pages[0].revisions || []) p('  ', x.timestamp.slice(5, 16), x.size, String(x.comment || '').slice(0, 90));
} catch (e) { p('revs', e.message); }
try {
  const r = await fetch('https://raw.githubusercontent.com/jolpica/jolpica-f1/main/TERMS.md', { headers: ua });
  p('== jolpica TERMS.md', r.status); p((await r.text()).slice(0, 2500));
} catch (e) { p('terms', e.message); }
try {
  const r = await fetch('https://api.jolpi.ca/ergast/f1/2026/17/qualifying.json?limit=3', { headers: ua });
  p('== jolpica Singapore qualifying', r.status, (await r.text()).slice(0, 600));
} catch (e) { p('jq', e.message); }
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n'));
