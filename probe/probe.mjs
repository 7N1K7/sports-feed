// probe 243: the WXV Global Series page's wikitext around its standings
import fs from 'fs';
const L = [];
for (const t of ['2026 WXV Global Series', '2026 Nations Championship']) {
  const w = await (await fetch(`https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(t)}&prop=wikitext|sections&format=json&formatversion=2`, { headers: { 'user-agent': 'kickoff.kiwi probe' } })).json();
  const wt = w.parse?.wikitext || '';
  L.push(`== ${t}: ${wt.length} chars; sections: ${(w.parse?.sections || []).map(s => s.line).join(' / ')}`);
  for (const m of wt.matchAll(/standings|Sports table|\{\{Rugby union standings|pos_|team\d+=|win_|\|\s*Pos\b/gi)) { if (L.length > 400) break; }
  const i = wt.search(/\{\{\s*(Sports table|Rugby union standings|[^}\n]*standings)/i);
  L.push('first table template at ' + i);
  if (i >= 0) L.push(wt.slice(i, i + 1800));
  const j = wt.search(/\n\{\|[^\n]*wikitable[^\n]*\n[^]*?(Pts|Points)/i);
  L.push('first wikitable with Pts at ' + j);
  if (j >= 0) L.push(wt.slice(j, j + 1500));
}
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
