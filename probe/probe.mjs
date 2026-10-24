import fs from 'fs';
const L = [];
const p = (...a) => L.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '));
const ua = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi) probe' };
const j = async u => { const r = await fetch(u, { headers: ua }); if (!r.ok) throw new Error(r.status + ' ' + u); return r.json(); };
const W = 'https://en.wikipedia.org/w/api.php?format=json&formatversion=2&';
const r = await j(`${W}action=parse&prop=wikitext&redirects=1&page=${encodeURIComponent('2026 Singapore Grand Prix')}`);
const w = r.parse.wikitext;
for (const h of ['Sprint qualifying classification', 'Sprint classification', 'Qualifying classification', 'Race classification']) {
  const i = w.search(new RegExp(`===\\s*${h}\\s*===`));
  p(`\n######## ${h} @${i}`); if (i >= 0) p(w.slice(i, i + (h.startsWith('Race') ? 3200 : 2600)));
}
const u = await j(`${W}action=parse&prop=wikitext&redirects=1&page=${encodeURIComponent('2026 United States Grand Prix')}`);
const uw = u.parse.wikitext, k = uw.search(/==\s*Practice/);
p('\n######## US practice now'); p(uw.slice(k, k + 1200));
const T = 'https://www.thesportsdb.com/api/v1/json/123/';
const x = await j(`${T}lookupevent.php?id=2408192`);
p('\n######## TSDB Singapore FP1 strResult'); p(String(x.events?.[0]?.strResult || '').slice(0, 1500));
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n'));
