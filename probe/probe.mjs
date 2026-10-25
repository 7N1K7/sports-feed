// probe 194: the USA Eagles' own word on the Nashville and New Jersey kick-off times (Wikipedia and Rugby Australia differ by an hour)
import fs from 'fs';
import { chromium } from 'playwright';
const L = [], b = await chromium.launch(), ctx = await b.newContext({ locale: 'en-US', timezoneId: 'America/Chicago' });
for (const u of ['https://eagles.rugby/news/wxv-heads-stateside-with-tests-in-texas-tennessee-and-new-jersey-2026623', 'https://eagles.rugby/schedule', 'https://eagles.rugby/news', 'https://www.geodisparkstadium.com/events', 'https://www.sportsillustratedstadium.com/events']) {
  const p = await ctx.newPage();
  try { const r = await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 25000 }); await p.waitForTimeout(5000);
    const txt = await p.evaluate(() => document.body.innerText);
    const hits = txt.split('\n').map(l => l.trim()).filter(l => /australia|wallab|eagles v|usa v|kick|p\.?m\.?\s*(ET|CT|EDT|CDT)|\b[0-9]{1,2}(:[0-9]{2})?\s*(p\.?m|a\.?m)/i.test(l) && l.length < 260);
    L.push(`${u} -> ${r?.status()} ${p.url()}\n  ` + [...new Set(hits)].slice(0, 25).join('\n  '));
    const links = await p.evaluate(() => [...new Set([...document.querySelectorAll('a[href]')].map(a => `${a.textContent.trim().slice(0, 80)} => ${a.href}`))].filter(s => /australia|nashville|new jersey|harrison/i.test(s)).slice(0, 10));
    if (links.length) L.push('  links: ' + links.join('\n    '));
  } catch (e) { L.push(`${u} ERR ${String(e.message).split('\n')[0]}`); }
  await p.close();
}
await b.close();
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
