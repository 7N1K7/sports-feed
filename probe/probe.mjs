// probe 196: Sky Go's pages: where a Sky Sport channel plays online (its sport page, live TV, a channel's own page)
import fs from 'fs';
import { chromium } from 'playwright';
const L = [];
const b = await chromium.launch();
const p = await b.newPage({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' });
for (const u of ['https://www.skygo.co.nz/sports', 'https://www.skygo.co.nz/livetv', 'https://www.skygo.co.nz/live-tv', 'https://www.skygo.co.nz/channels', 'https://www.skygo.co.nz/tv-guide', 'https://www.sky.co.nz/sports']) {
  try {
    const r = await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 30000 }); await p.waitForTimeout(5000);
    const info = await p.evaluate(() => ({ title: document.title, h1: [...document.querySelectorAll('h1,h2')].slice(0, 6).map(x => x.textContent.trim().slice(0, 50)), links: [...new Set([...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => /sport|live|channel|guide/i.test(h)))].slice(0, 30) }));
    L.push(`${u} -> ${r?.status()} ${p.url()}\n  title=${info.title}\n  heads=${info.h1.join(' | ')}\n  links=${info.links.join(' ')}`);
  } catch (e) { L.push(`${u} ERR ${e.message.slice(0, 120)}`); }
}
await b.close();
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
