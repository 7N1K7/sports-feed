// probe 244: Test match templates on two series pages (innings scores, the missing 1st Test)
import fs from 'fs';
const L = [];
for (const t of ['Australian cricket team in South Africa in 2026–27', 'West Indian cricket team in Bangladesh in 2026–27']) {
  const w = await (await fetch(`https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(t)}&prop=wikitext&format=json&formatversion=2`, { headers: { 'user-agent': 'kickoff.kiwi probe' } })).json();
  const wt = w.parse?.wikitext || '';
  L.push(`== ${t}: ${wt.length} chars`);
  for (const m of wt.matchAll(/\{\{\s*(Test match|Single-innings cricket match|Limited overs matches|cricket match)[^]*?\n\}\}/gi)) L.push(m[0].replace(/<ref[^]*?(<\/ref>|\/>)/g, '').slice(0, 1600), '----');
  const i = wt.indexOf('1st Test'); L.push('1st Test mentions: ' + [...wt.matchAll(/1st Test/g)].length + (i >= 0 ? ' first ctx: ' + wt.slice(Math.max(0, i - 200), i + 300) : ''));
}
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
