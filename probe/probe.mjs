import fs from 'fs';
const out = [];
const j = async u => { try { const r = await fetch(u, { headers: { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi)' } }); return await r.json(); } catch (e) { return { err: e.message }; } };
const w = await j('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content|timestamp&rvslots=main&titles=2026_WXV_Global_Series');
const rv = w.query?.pages?.[0]?.revisions?.[0], t = rv?.slots?.main?.content || '';
out.push('rev ' + rv?.timestamp);
let i = -1; const hits = [];
while ((i = t.indexOf('Chichibunomiya', i + 1)) >= 0) hits.push(i);
out.push('hits ' + hits.length);
for (const h of hits.slice(1)) out.push('---\n' + t.slice(Math.max(0, h - 700), h + 150));
// titles for town lookups
const titles = ['Austin, Texas', 'Charlotte, North Carolina', 'Memphis, Tennessee', 'New York City', 'Orlando, Florida', 'Phoenix, Arizona', 'Portland, Oregon', 'Washington, D.C.', 'Harrison, New Jersey', 'Georgia (U.S. state)', 'Benoni, Gauteng', 'Benoni, South Africa', 'Kimberley, Northern Cape', 'Kimberley, South Africa', 'Mullanpur', 'New Chandigarh', 'Mullanpur, Punjab', 'Paradise, Nevada', 'Cumberland, Georgia', 'Mansfield, Texas', 'Hamilton, Ontario', 'Victoria (state)'];
const r = await j('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&redirects=1&prop=pageprops|description&ppprop=disambiguation&titles=' + encodeURIComponent(titles.join('|')));
const norm = Object.fromEntries((r.query?.normalized || []).map(x => [x.from, x.to])), red = Object.fromEntries((r.query?.redirects || []).map(x => [x.from, x.to]));
const pages = Object.fromEntries((r.query?.pages || []).map(p => [p.title, p]));
for (const q of titles) { const n = norm[q] || q, f = red[n] || n, p = pages[f]; out.push(`${p?.missing ? 'MISSING' : p?.pageprops?.disambiguation !== undefined ? 'DISAMBIG' : 'ok'}\t${q} -> ${f} (${(p?.description || '').slice(0, 60)})`); }
fs.writeFileSync(new URL('./out.txt', import.meta.url), out.join('\n'));
