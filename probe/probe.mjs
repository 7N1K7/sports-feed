// probe 189: the live and sport links on ThreeNow, RNZ, Whakaata Māori and Sky Go, and whether the guesses open
import fs from 'fs';
import { chromium } from 'playwright';
const L = [], b = await chromium.launch(), ctx = await b.newContext({ locale: 'en-NZ', timezoneId: 'Pacific/Auckland' });
for (const u of ['https://www.threenow.co.nz', 'https://www.threenow.co.nz/categories/sport', 'https://www.rnz.co.nz', 'https://www.whakaatamaori.co.nz', 'https://www.skygo.co.nz', 'https://www.tvnz.co.nz/sport']) {
  const p = await ctx.newPage();
  try {
    await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 25000 }); await p.waitForTimeout(5000);
    const a = await p.evaluate(() => [...new Set([...document.querySelectorAll('a[href]')].map(x => `${x.textContent.trim().replace(/\s+/g, ' ').slice(0, 40)} => ${x.href}`))].filter(s => /live|sport|channel|listen|stream|guide/i.test(s)).slice(0, 40));
    L.push(`${u} (${p.url()})\n  ` + a.join('\n  '));
  } catch (e) { L.push(`${u} ERR ${String(e.message).split('\n')[0]}`); }
  await p.close();
}
for (const u of ['https://www.threenow.co.nz/live-tv-guide', 'https://www.threenow.co.nz/live-tv-guide/three', 'https://www.threenow.co.nz/channel/three', 'https://www.rnz.co.nz/listen', 'https://www.rnz.co.nz/national', 'https://www.rnz.co.nz/audio/live', 'https://www.whakaatamaori.co.nz/live', 'https://www.whakaatamaori.co.nz/watch', 'https://www.skygo.co.nz/sports', 'https://www.skygo.co.nz/live-tv']) {
  const p = await ctx.newPage();
  try { const r = await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 25000 }); await p.waitForTimeout(3500);
    const t = await p.evaluate(() => [document.title, [...document.querySelectorAll('h1,h2')].map(x => x.textContent.trim()).slice(0, 3).join(' | ')]);
    L.push(`${u} -> ${r?.status()} ${p.url()} title="${t[0].slice(0, 80)}" heads="${t[1].slice(0, 120)}"`);
  } catch (e) { L.push(`${u} ERR ${String(e.message).split('\n')[0]}`); }
  await p.close();
}
await b.close();
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
