// probe 245: the Test section of the SA v AUS page, as wikitext
import fs from 'fs';
const L = [];
const t = 'Australian cricket team in South Africa in 2026–27';
const w = await (await fetch(`https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(t)}&prop=wikitext&format=json&formatversion=2`, { headers: { 'user-agent': 'kickoff.kiwi probe' } })).json();
const wt = w.parse?.wikitext || '';
const i = wt.search(/==\s*Test series\s*==/i);
L.push('Test series at ' + i);
L.push(wt.slice(i, i + 9000).replace(/<ref[^]*?(<\/ref>|\/>)/g, ''));
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
