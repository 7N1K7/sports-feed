// probe 106: LPGA and PGA Tour schedule rows, Twemoji sailing and golf icons, ATP doubles table
import { writeFileSync } from 'node:fs';
const UA = { 'User-Agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi; probe)' };
const j = async u => { try { const r = await fetch(u, { headers: UA }); return r.ok ? await r.json() : { status: r.status }; } catch (e) { return { error: e.message }; } };
const W = 'https://en.wikipedia.org/w/api.php?format=json&formatversion=2&';
const wikitext = async t => (await j(W + 'action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(t)))?.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content || '';
const section = (text, re) => { const i = text.search(re); if (i < 0) return ''; const rest = text.slice(i); const n = rest.slice(3).search(/\n==[^=]/); return n < 0 ? rest : rest.slice(0, n + 3); };
const lp = await wikitext('2026 LPGA Tour');
const s = section(lp, /==\s*Schedule and results\s*==/i);
console.log('LPGA section', s.length, '\n' + s.slice(0, 2600).replace(/<ref[\s\S]*?(<\/ref>|\/>)/g, ''));
console.log('\nLPGA rows near Oct:', (s.match(/\n\|-[^\n]*\n[^\n]*(Oct|Nov)[\s\S]{0,400}/g) || []).slice(0, 2).join('\n---\n'));
const pga = section(await wikitext('2026 PGA Tour'), /==\s*Schedule\s*==/i).replace(/<ref[\s\S]*?(<\/ref>|\/>)/g, '').replace(/\{\{efn[\s\S]*?\}\}/g, '');
console.log('\nPGA rows 2-6:\n' + pga.split(/\n\|-/).slice(2, 7).join('\n|-').slice(0, 1800));
console.log('\nPGA rows Aug-Dec:\n' + (pga.match(/\n\|-[^\n]*\n\|\s*(Aug|Sep|Oct|Nov|Dec)[\s\S]{0,300}/g) || []).slice(0, 4).join(''));
for (const t of ['2027 PGA Tour', '2027 LPGA Tour', '2025–26 PGA Tour of Australasia']) console.log('exists', t, (await wikitext(t)).length);
for (const [n, cp] of [['sailing', '26f5'], ['golf', '26f3']]) {
  try { const r = await fetch(`https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${cp}.svg`); const t = await r.text(); writeFileSync(`probe/out-${n}.svg`, t); console.log('icon', n, r.status, t.length); } catch (e) { console.log('icon', n, e.message); }
}
const atp = await j(W + 'action=parse&prop=text&redirects=1&page=ATP%20rankings');
const html = atp?.parse?.text || '';
for (const m of html.matchAll(/doubles/gi)) { if (m.index > 0) { console.log('\nATP "doubles" context:', html.slice(m.index - 200, m.index + 200).replace(/\s+/g, ' ').replace(/<[^>]+>/g, '·')); break; } }
const k = html.search(/\(doubles\)/i); console.log('(doubles) at', k);
if (k > 0) { const tbl = html.slice(k).match(/<table[\s\S]*?<\/table>/)?.[0] || ''; console.log([...tbl.matchAll(/<tr[\s\S]*?<\/tr>/g)].slice(0, 6).map(m => m[0].replace(/\s+/g, ' ').replace(/<a [^>]*>|<\/a>|<span[^>]*>|<\/span>|<img[^>]*>/g, '').slice(0, 500)).join('\n')); }
