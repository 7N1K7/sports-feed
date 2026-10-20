// probe 56: the filters tab on the live site in desktop Chrome at compact widths, scrolled with the mouse wheel
import { chromium } from 'playwright';
const out = f => new URL(f, import.meta.url).pathname;
const b = await chromium.launch();
for (const w of [900, 520]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 800 }, colorScheme: 'dark' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('https://kickoff.kiwi/', { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(3000);
  const st = () => p.evaluate(() => { const b = document.getElementById('foldBtn'), r = b.getBoundingClientRect(), h = document.querySelector('header.top'), at = document.elementFromPoint(r.left + r.width / 2, r.top + 10);
    return `v${document.getElementById('ver')?.textContent} scrollY ${Math.round(scrollY)} scroller ${document.scrollingElement?.tagName} | header "${h.className}" | tab opacity ${getComputedStyle(b).opacity} events ${getComputedStyle(b).pointerEvents} | at tab: ${at?.tagName}.${at?.className?.baseVal ?? at?.className}`; });
  console.log(w, 'loaded:', await st());
  await p.mouse.move(w / 2, 400);
  for (let i = 0; i < 4; i++) { await p.mouse.wheel(0, 120); await p.waitForTimeout(250); }
  console.log(w, 'after 4 wheel notches:', await st());
  await p.screenshot({ path: out(`out-${w}-scrolled.png`), clip: { x: 0, y: 0, width: w, height: 260 } });
  console.log(w, 'errors:', errs.join(' | ') || 'none');
  await ctx.close();
}
await b.close();
