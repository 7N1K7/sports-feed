import fs from 'fs';
const qs = JSON.parse(fs.readFileSync(new URL('./placeq.json', import.meta.url))).filter(q => !/^TBC/.test(q));
const out = [];
for (let i = 0; i < qs.length; i += 50) {
  const t = qs.slice(i, i + 50);
  const r = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&redirects=1&prop=pageprops|description&ppprop=disambiguation&titles=' + encodeURIComponent(t.join('|')), { headers: { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi)' } })).json();
  const norm = Object.fromEntries((r.query?.normalized || []).map(x => [x.from, x.to])), red = Object.fromEntries((r.query?.redirects || []).map(x => [x.from, x.to]));
  const pages = Object.fromEntries((r.query?.pages || []).map(p => [p.title, p]));
  for (const q of t) { const n = norm[q] || q, f = red[n] || n, p = pages[f]; out.push(`${p?.missing ? 'MISSING' : p?.pageprops?.disambiguation !== undefined ? 'DISAMBIG' : 'ok'}\t${q} -> ${f} (${(p?.description || '').slice(0, 60)})`); }
}
fs.writeFileSync(new URL('./out.txt', import.meta.url), out.sort().join('\n'));
