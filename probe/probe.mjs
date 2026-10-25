// probe 193: Wikipedia's match boxes for the USA v Australia (A) games in Nashville and Harrison, as written
import fs from 'fs';
const L = [], ua = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi) probe' };
const r = await (await fetch(`https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=parse&prop=wikitext&page=${encodeURIComponent("2026 men's rugby union internationals")}`, { headers: ua })).json();
const w = String(r.parse?.wikitext || '');
for (const m of w.matchAll(/\{\{\s*rugbybox[\s\S]*?\n\}\}/gi)) if (/Nashville|Geodis|Harrison|Sports Illustrated/i.test(m[0])) L.push(m[0].slice(0, 900) + '\n----');
const i = w.search(/Geodis/); L.push('CONTEXT BEFORE: ' + w.slice(Math.max(0, i - 2500), i - 600).replace(/\n/g, ' ⏎ ').slice(-1500));
// the templates used for the A sides
L.push('ruA uses: ' + [...new Set(w.match(/\{\{\s*ruA\|[^}]*\}\}/g) || [])].join(' '));
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
