// probe 228: Constellation Cup 2026 games 3 and 4 (Wikipedia), and what's announced next for the Silver Ferns and Black Sticks women
import fs from 'fs';
const L = [], UA = { 'User-Agent': 'kickoff.kiwi probe' };
const wiki = async t => { const r = await fetch(`https://en.wikipedia.org/w/api.php?action=parse&format=json&prop=wikitext&redirects=1&page=${encodeURIComponent(t)}`, { headers: UA }); const j = await r.json(); return j.parse?.wikitext?.['*'] || `(none: ${j.error?.info})`; };
for (const t of ['2026 Constellation Cup']) { const w = await wiki(t); L.push(`== ${t} (${w.length})`); L.push(w.slice(0, 9000)); }
for (const t of ['New Zealand national netball team', 'New Zealand women\'s national field hockey team']) {
  const w = await wiki(t); L.push(`== ${t}: lines naming 2026/2027 fixtures`);
  L.push(...w.split('\n').filter(x => /202[67]/.test(x) && /(fixture|series|tour|cup|league|nations|v |vs)/i.test(x)).slice(0, 25).map(x => x.slice(0, 220)));
}
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
