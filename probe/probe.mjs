// probe 204: the India A section of the India tour page, as written (squads table and the first match)
import fs from 'fs';
const UA = { headers: { 'user-agent': 'KickoffKiwi probe (https://kickoff.kiwi)' } };
const j = await (await fetch('https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext&redirects=1&format=json&formatversion=2&page=' + encodeURIComponent('Indian cricket team in New Zealand in 2026–27'), UA)).json();
const w = j.parse?.wikitext || '', i = w.search(/^==\s*India A cricket team in New Zealand/m);
fs.writeFileSync(new URL('./out.txt', import.meta.url), w.slice(i, i + 6000).replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/g, '') + '\n');
