// probe 197: Sky Go's channel pages (which code is which Sky Sport channel, and what a channel page does logged out),
// and flagcdn's France and India flags (their drawing, for the white edges)
import fs from 'fs';
import { chromium } from 'playwright';
const L = [];
const b = await chromium.launch();
const p = await b.newPage({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', viewport: { width: 1400, height: 3000 } });
try {
  await p.goto('https://www.skygo.co.nz/tv-guide', { waitUntil: 'domcontentloaded', timeout: 30000 }); await p.waitForTimeout(6000);
  for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 3000); await p.waitForTimeout(1200); }
  const chans = await p.evaluate(() => [...document.querySelectorAll('a[href*="/watch-tv/"]')].map(a => {
    const img = a.querySelector('img'); const near = a.closest('[class*="channel" i], [class*="row" i], li, div');
    return `${a.getAttribute('href').split('?')[0]} | ${(a.getAttribute('aria-label') || '').slice(0, 40)} | ${(img?.alt || '').slice(0, 40)} | ${(a.title || '').slice(0, 40)} | ${a.innerText.trim().replace(/\s+/g, ' ').slice(0, 40)}`; }));
  L.push(`channels ${chans.length}`); [...new Set(chans)].forEach(c => L.push('  ' + c));
} catch (e) { L.push('guide ERR ' + e.message.slice(0, 120)); }
for (const u of ['https://www.skygo.co.nz/watch-tv/SPT1', 'https://www.skygo.co.nz/watch-tv/SPT1?playerReferrer=TV%20Guide']) {
  try { const r = await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 30000 }); await p.waitForTimeout(5000);
    L.push(`${u} -> ${r?.status()} ${p.url()} title=${await p.title()} text=${(await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 300)}`); } catch (e) { L.push(`${u} ERR ${e.message.slice(0, 100)}`); }
}
await b.close();
for (const c of ['fr', 'in', 'it', 'ie']) { const t = await (await fetch(`https://flagcdn.com/${c}.svg`)).text(); L.push(`flag ${c} (${t.length}): ${t.slice(0, 700)}`); }
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
