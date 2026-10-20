// probe 55: the filters tab on the live site, as an Android phone (Galaxy A34 size) loads it: tap it, scroll, look
import { chromium } from 'playwright';
const out = f => new URL(f, import.meta.url).pathname;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, colorScheme: 'dark', isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-A346E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36' });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await p.goto('https://kickoff.kiwi/', { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(3000);
const st = () => p.evaluate(() => { const b = document.getElementById('foldBtn'); if (!b) return 'no tab on the page'; const r = b.getBoundingClientRect(), h = document.querySelector('header.top'), at = document.elementFromPoint(r.left + r.width / 2, r.top + 10);
  return `v${document.getElementById('ver')?.textContent || ''} | scrollY ${Math.round(scrollY)} | header "${h.className}" | tab opacity ${getComputedStyle(b).opacity} events ${getComputedStyle(b).pointerEvents} display ${getComputedStyle(b).display} | box ${[r.left, r.top, r.width, r.height].map(Math.round)} | top element at the tab: ${at?.tagName}.${at?.className?.baseVal ?? at?.className}#${at?.id} | filters folded: ${document.querySelector('main').classList.contains('folded')}`; });
console.log('loaded:', await st());
await p.screenshot({ path: out('out-1-top.png'), clip: { x: 0, y: 0, width: 412, height: 330 } });
const r = await p.$eval('#foldBtn', x => { const b = x.getBoundingClientRect(); return [b.left + b.width / 2, b.top + 10]; });
await p.touchscreen.tap(r[0], r[1]); await p.waitForTimeout(600);
console.log('after tapping the tab:', await st());
await p.screenshot({ path: out('out-2-tapped.png'), clip: { x: 0, y: 0, width: 412, height: 330 } });
await p.touchscreen.tap(r[0], r[1]); await p.waitForTimeout(600);
console.log('after tapping again:', await st());
await p.evaluate(() => scrollTo(0, 700)); await p.waitForTimeout(700);
console.log('scrolled down:', await st());
await p.screenshot({ path: out('out-3-scrolled.png'), clip: { x: 0, y: 0, width: 412, height: 330 } });
await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(700);
console.log('back at the top:', await st());
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
