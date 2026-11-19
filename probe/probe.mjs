// v801: the live series row after the hockey and netball buttons were shortened. Names and widths only, no results.
import { writeFileSync } from 'node:fs';
const out = []; process.on('exit', () => writeFileSync('probe/out.txt', out.join('\n') + '\n'));
const { chromium } = await import('playwright');
const b = await chromium.launch({ channel: 'chrome' });
try {
  for (const w of [412, 1280]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 2 });
    await ctx.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); } catch {} });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.message).slice(0, 120)));
    await p.goto('https://kickoff.kiwi/?t=' + Date.now(), { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#nowChips', { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(1500);
    const s = await p.evaluate(() => ({ code: /pairSides/.test(document.documentElement.innerHTML), chips: [...document.querySelectorAll('#nowChips > *')].map(c => `${c.classList.contains('two') ? 'two-sides' : 'named'} "${c.textContent.trim().replace(/\s+/g, ' ')}" {${c.getAttribute('aria-label') || c.title}} ${Math.round(c.getBoundingClientRect().width)}px`), ox: document.documentElement.scrollWidth > innerWidth }));
    out.push(`${w}px: new code ${s.code}, sideways overflow ${s.ox}, page errors ${errs.length}`, ...s.chips.map(c => '  ' + c));
    await p.locator('#nowBar').screenshot({ path: `probe/out-row-${w}.png` }).catch(e => out.push('shot: ' + e.message.slice(0, 80)));
    await ctx.close(); }
} catch (e) { out.push('probe error: ' + String(e.message).slice(0, 300)); }
await b.close();
