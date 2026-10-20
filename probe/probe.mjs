// probe 60: the share image, two even rows of sports
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.goto('file://' + new URL('og/og.html', import.meta.url).pathname, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800);
console.log('fonts:', await p.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight).join(', ')));
console.log('fits:', await p.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(); return JSON.stringify({ head: r('.head').right, chipsBottom: r('.chips').bottom, freeTop: r('.free').top, urlTop: r('.url').top }); }));
await p.screenshot({ path: new URL('out-og.png', import.meta.url).pathname });
await b.close();
