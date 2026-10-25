// probe 192: the Nashville and Harrison games: Australia A or the Wallabies? where they're shown; what Wikipedia lists
import fs from 'fs';
import { chromium } from 'playwright';
const L = [], ua = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi) probe' };
const r = await (await fetch(`https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=parse&prop=wikitext&page=${encodeURIComponent("2026 men's rugby union internationals")}`, { headers: ua })).json();
const w = String(r.parse?.wikitext || '');
for (const m of w.matchAll(/United States/g)) { const i = m.index; if (/Australia/.test(w.slice(i - 400, i + 400))) { L.push('WIKI: ' + w.slice(i - 500, i + 500).replace(/\n/g, ' ⏎ ')); break; } }
L.push('\nmentions of "Australia A": ' + (w.match(/Australia A\b/g) || []).length);
const b = await chromium.launch(), ctx = await b.newContext({ locale: 'en-NZ', timezoneId: 'Pacific/Auckland' });
for (const u of ['https://www.rugby.com.au/news/australia-a-team-confirmed-to-play-usa-in-nashville-20261022', 'https://www.rugby.com.au/news/australia-a-thump-usa-to-open-twomatch-series-on-high-20261025', 'https://www.rugby.com.au/more/how-to-watch']) {
  const p = await ctx.newPage();
  try { await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 25000 }); await p.waitForTimeout(5000);
    const txt = await p.evaluate(() => document.body.innerText);
    const hits = txt.split('\n').filter(l => /watch|stan|nine|9now|broadcast|stream|live on|new zealand|sky|kick-?off|AEDT|AEST|Harrison|New Jersey|Wallabies|Australia A/i.test(l)).map(l => l.trim()).filter(l => l.length > 3 && l.length < 300);
    L.push(`\n${u}\n  ` + [...new Set(hits)].slice(0, 30).join('\n  '));
  } catch (e) { L.push(`${u} ERR ${String(e.message).split('\n')[0]}`); }
  await p.close();
}
await b.close();
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
