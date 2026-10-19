// probe 24: phone screenshots of the live site for the home-screen app mock-up, and an HTTPS check
import { chromium } from 'playwright';
const out = f => new URL(f, import.meta.url).pathname;
let url = 'https://kickoff.kiwi/';
try { await fetch(url, { signal: AbortSignal.timeout(10000) }); } catch { url = 'http://kickoff.kiwi/'; }
console.log('using', url);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, colorScheme: 'dark', isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(2500);
await p.screenshot({ path: out('out-phone-top.png') });
// a second view: scrolled to the first section of games
await p.evaluate(() => { const h = document.querySelector('#liveSec:not([hidden]), #todaySec:not([hidden])'); if (h) window.scrollTo(0, h.getBoundingClientRect().top + scrollY - 70); });
await p.waitForTimeout(800);
await p.screenshot({ path: out('out-phone-games.png') });
await b.close();
console.log('done');
