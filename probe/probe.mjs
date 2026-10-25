// probe 188: where each watch service's sport (or live channel) page is: final address, status, title and first heading
import fs from 'fs';
import { chromium } from 'playwright';
const U = [
  'https://www.tvnz.co.nz', 'https://www.tvnz.co.nz/sport', 'https://www.tvnz.co.nz/categories/sport', 'https://www.tvnz.co.nz/livetv/tvnz-1', 'https://www.tvnz.co.nz/livetv/tvnz-2', 'https://www.tvnz.co.nz/livetv/tvnz-duke',
  'https://www.threenow.co.nz', 'https://www.threenow.co.nz/sport', 'https://www.threenow.co.nz/categories/sport', 'https://www.threenow.co.nz/live-tv', 'https://www.threenow.co.nz/live-tv/three',
  'https://www.sky.co.nz/skyopen', 'https://www.skyopen.co.nz', 'https://www.skyopen.co.nz/sport', 'https://www.sky.co.nz/sports', 'https://www.sky.co.nz/sport', 'https://www.sky.co.nz/sports/espn', 'https://www.sky.co.nz/sports/sky-arena',
  'https://www.skygo.co.nz', 'https://www.skygo.co.nz/sport', 'https://www.skysportnow.co.nz', 'https://www.whakaatamaori.co.nz', 'https://www.whakaatamaori.co.nz/sport', 'https://www.whakaatamaori.co.nz/hakinakina',
  'https://www.rnz.co.nz/live', 'https://www.nzc.nz', 'https://www.dazn.com', 'https://www.icc.tv',
  'https://10.com.au', 'https://10play.com.au/sport', 'https://www.9now.com.au', 'https://www.9now.com.au/sport', 'https://www.9now.com.au/live', 'https://7plus.com.au', 'https://7plus.com.au/sport', 'https://www.paramountplus.com/au/', 'https://www.paramountplus.com/au/sports/',
];
const L = [], b = await chromium.launch(), ctx = await b.newContext({ locale: 'en-NZ', timezoneId: 'Pacific/Auckland' });
for (const u of U) {
  const p = await ctx.newPage();
  try {
    const r = await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 25000 }); await p.waitForTimeout(3500);
    const info = await p.evaluate(() => ({ t: document.title, h: [...document.querySelectorAll('h1, h2')].map(x => x.textContent.trim()).filter(Boolean).slice(0, 3).join(' | '), n: document.body?.innerText.length || 0 }));
    L.push(`${u}\n   -> ${r?.status()} ${p.url()}\n   title="${info.t.slice(0, 90)}" heads="${info.h.slice(0, 140)}" text=${info.n}`);
  } catch (e) { L.push(`${u}\n   ERR ${String(e.message).split('\n')[0].slice(0, 120)}`); }
  await p.close();
}
await b.close();
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
