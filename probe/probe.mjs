// probe 202: the India A tour of New Zealand on Wikipedia: which pages exist, and their squads sections
import fs from 'fs';
const L = [], UA = { headers: { 'user-agent': 'KickoffKiwi probe (https://kickoff.kiwi)' } };
const api = q => fetch('https://en.wikipedia.org/w/api.php?' + q + '&format=json&formatversion=2', UA).then(r => r.json());
for (const q of ['India A cricket team in New Zealand 2026', 'New Zealand A India A 2026 four-day', 'Indian A cricket team in New Zealand']) {
  const s = await api('action=query&list=search&srlimit=8&srsearch=' + encodeURIComponent(q));
  L.push(`search "${q}": ` + (s.query?.search || []).map(x => x.title).join(' | '));
}
const cand = ['Indian A cricket team in New Zealand in 2026–27', 'India A cricket team in New Zealand in 2026–27', 'Indian A cricket team in New Zealand in 2026', 'New Zealand A cricket team', 'India A cricket team'];
for (const t of cand) {
  const j = await api('action=parse&prop=wikitext&redirects=1&page=' + encodeURIComponent(t));
  const w = j.parse?.wikitext || '';
  if (!w) { L.push(`-- ${t}: missing`); continue; }
  L.push(`-- ${t} (${j.parse.title}): ${w.length} chars`);
  const i = w.search(/==\s*(Squads?|Current squad|Squad)\s*==/i);
  if (i >= 0) L.push(w.slice(i, i + 2500).replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/g, ''));
  else L.push('  headings: ' + (w.match(/^==[^=].*==\s*$/gm) || []).join(' '));
}
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
