// probe 203: where the India A tour of New Zealand (Oct 2026) is written up on Wikipedia, and any squads for it
import fs from 'fs';
const L = [], UA = { headers: { 'user-agent': 'KickoffKiwi probe (https://kickoff.kiwi)' } };
const api = q => fetch('https://en.wikipedia.org/w/api.php?' + q + '&format=json&formatversion=2', UA).then(r => r.json());
for (const q of ['"India A" New Zealand Lincoln 2026', '"India A" "New Zealand A" October 2026', '2026–27 New Zealand cricket season']) {
  const s = await api('action=query&list=search&srlimit=10&srsearch=' + encodeURIComponent(q));
  L.push(`search ${q}: ` + (s.query?.search || []).map(x => x.title).join(' | '));
}
for (const t of ['Indian cricket team in New Zealand in 2026–27', '2026–27 New Zealand cricket season', 'International cricket in 2026–27']) {
  const j = await api('action=parse&prop=wikitext&redirects=1&page=' + encodeURIComponent(t));
  const w = j.parse?.wikitext || '';
  if (!w) { L.push(`-- ${t}: missing`); continue; }
  L.push(`-- ${t}: ${w.length} chars; headings: ` + (w.match(/^==[^=].*==\s*$/gm) || []).join(' '));
  const lines = w.split('\n'); lines.forEach((l, i) => { if (/India A|New Zealand A|\bA tour/i.test(l)) L.push(`  ${i}: ${lines.slice(i, i + 2).join(' ').slice(0, 300)}`); });
  const i = w.search(/==\s*Squads?\s*==/i); if (i >= 0) L.push(w.slice(i, i + 1800).replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/g, ''));
}
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
