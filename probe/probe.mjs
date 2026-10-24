import fs from 'fs';
const ua = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi) probe' };
const out = {};
for (const t of ['2026 Singapore Grand Prix', '2026 United States Grand Prix', '2026 Mexico City Grand Prix', '2025 São Paulo Grand Prix']) {
  const r = await (await fetch(`https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=parse&prop=wikitext&redirects=1&page=${encodeURIComponent(t)}`, { headers: ua })).json();
  out[t] = r.parse?.wikitext || r.error?.info;
}
const T = 'https://www.thesportsdb.com/api/v1/json/123/';
out.tsdb17 = await (await fetch(`${T}eventsround.php?id=4370&r=17&s=2026`, { headers: ua })).json();
fs.writeFileSync(new URL('./out.txt', import.meta.url), JSON.stringify(out));
