// probe 191: every watch link the site now uses opens a real page; and how to watch the USA XV v Wallabies tests
import fs from 'fs';
import { chromium } from 'playwright';
const U = ['https://www.tvnz.co.nz/sport', 'https://www.tvnz.co.nz/livetv/tvnz-1', 'https://www.tvnz.co.nz/livetv/tvnz-2', 'https://www.tvnz.co.nz/livetv/tvnz-duke',
  'https://www.threenow.co.nz/live-tv-guide', 'https://www.threenow.co.nz/live-tv-guide/three', 'https://www.threenow.co.nz/live-tv-guide/sky-open', 'https://www.threenow.co.nz/live-tv-guide/rush',
  'https://www.threenow.co.nz/live-tv-guide/bravo', 'https://www.threenow.co.nz/live-tv-guide/eden', 'https://www.skygo.co.nz/sports', 'https://www.rnz.co.nz/radio', 'https://www.maoriplus.co.nz/live',
  'https://10.com.au/sport', 'https://7plus.com.au/sport'];
const L = [], b = await chromium.launch(), ctx = await b.newContext({ locale: 'en-NZ', timezoneId: 'Pacific/Auckland' });
for (const u of U) {
  const p = await ctx.newPage();
  try { const r = await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 25000 }); await p.waitForTimeout(3500);
    const t = await p.evaluate(() => [document.title, [...document.querySelectorAll('h1,h2')].map(x => x.textContent.trim()).filter(Boolean).slice(0, 2).join(' | ')]);
    L.push(`${u} -> ${r?.status()} ${p.url()} title="${t[0].slice(0, 70)}" heads="${t[1].slice(0, 90)}"`);
  } catch (e) { L.push(`${u} ERR ${String(e.message).split('\n')[0]}`); }
  await p.close();
}
L.push('\nWALLABIES v USA XV, how to watch:');
for (const u of ['https://www.rugby.com.au/news', 'https://www.rugby.com.au/wallabies']) {
  const p = await ctx.newPage();
  try { await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 25000 }); await p.waitForTimeout(5000);
    const a = await p.evaluate(() => [...new Set([...document.querySelectorAll('a[href]')].map(x => `${x.textContent.trim().replace(/\s+/g, ' ').slice(0, 90)} => ${x.href}`))].filter(s => /usa|united states|nashville|eagles|how to watch|broadcast|stan|nine/i.test(s)).slice(0, 15));
    L.push(`${u}\n  ` + a.join('\n  '));
    const txt = await p.evaluate(() => document.body.innerText.match(/[^\n]*(Stan|Nine|9Now|broadcast|live on)[^\n]*/gi)?.slice(0, 8) || []);
    L.push('  text: ' + txt.join(' || ').slice(0, 600));
  } catch (e) { L.push(`${u} ERR ${String(e.message).split('\n')[0]}`); }
  await p.close();
}
await b.close();
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
