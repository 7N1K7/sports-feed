// probe 57: the filters tab on the live site after a real finger swipe on a phone, watched every 100ms
import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, colorScheme: 'dark', isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-A346E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36' });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('https://kickoff.kiwi/', { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(3000);
const cdp = await ctx.newCDPSession(p);
await p.evaluate(() => { window.__log = []; const h = document.querySelector('header.top'), b = document.getElementById('foldBtn'), t0 = performance.now();
  const tick = () => { const s = `y${Math.round(scrollY)} ${h.classList.contains('scrolled') ? 'S' : '-'} op${getComputedStyle(b).opacity.slice(0, 4)} tabTop${Math.round(b.getBoundingClientRect().top)} hdrH${Math.round(h.getBoundingClientRect().height)}`;
    if (window.__log.at(-1)?.s !== s) window.__log.push({ t: Math.round(performance.now() - t0), s }); requestAnimationFrame(tick); }; tick(); });
for (const [label, dist] of [['swipe up 300px', -300], ['swipe up 600px more', -600], ['swipe down 200px', 200]]) {
  await cdp.send('Input.synthesizeScrollGesture', { x: 200, y: 600, yDistance: dist, speed: 1500, gestureSourceType: 'touch' });
  await p.waitForTimeout(2500);
  const log = await p.evaluate(() => { const l = window.__log; window.__log = []; return l; });
  console.log(`${label}: ` + log.map(x => `[${x.t}ms ${x.s}]`).join(' '));
}
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
