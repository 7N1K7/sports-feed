// probe 185: the US GP article's practice section, and the diffs that added each practice
import fs from 'fs';
const ua = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi) probe' }, L = [];
const r = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=parse&prop=wikitext&page=' + encodeURIComponent('2026 United States Grand Prix'), { headers: ua })).json();
const w = r.parse.wikitext, i = w.search(/^==\s*(Free )?practice\s*==\s*$/im);
L.push('PRACTICE SECTION:\n' + w.slice(i, i + 1600));
const h = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=ids|timestamp&rvlimit=6&titles=' + encodeURIComponent('2026 United States Grand Prix'), { headers: ua })).json();
for (const rv of (h.query.pages[0].revisions || []).slice(0, 4)) {
  const d = await (await fetch(`https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=compare&fromrev=${rv.parentid}&torev=${rv.revid}&prop=diff`, { headers: ua })).json();
  const ins = [...String(d.compare?.body || '').matchAll(/<ins[^>]*>([\s\S]*?)<\/ins>/g)].map(m => m[1].replace(/<[^>]+>/g, '')).join(' … ');
  L.push(`\n${rv.timestamp} added: ${ins.slice(0, 500)}`);
}
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
