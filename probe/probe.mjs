import { writeFileSync } from 'fs';
import { chromium } from 'playwright';
const out = [];
// v594 live: the eye on the NBA's faded button (Basketball picked); names and dots only, no results
const b = await chromium.launch({ channel: 'chrome' });
for (const vw of [1280, 820, 412, 360]) {
  const ctx = await b.newContext({ viewport: { width: vw, height: 900 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); localStorage.setItem('sf.sport', '["basketball"]'); localStorage.setItem('sf.comp', '""'); localStorage.removeItem('sf.showHere'); } catch (e) {} });
  try {
    await p.goto('https://kickoff.kiwi/?v=' + Date.now(), { waitUntil: 'networkidle', timeout: 45000 });
    await p.waitForSelector('#weekComps .qeye', { timeout: 15000 }); await p.waitForTimeout(1200);
    const st = () => p.evaluate(() => { const box = document.getElementById('weekComps'), r = box.getBoundingClientRect(), eye = box.querySelector('.qeye'), nba = box.querySelector('[data-off]'), w = document.getElementById('offWeekW');
      return { kinds: [...box.querySelectorAll('button')].map(x => x.classList.contains('qeye') ? 'eye' : x.classList.contains('nowchip') ? 'c' : x.classList.contains('qt') ? 't' : '+').join(','), x: Math.round(r.left), w: Math.round(r.width),
        eye: eye?.getAttribute('aria-pressed'), faded: nba?.classList.contains('is-off'), dots: document.querySelectorAll('#week .dot').length, note: w.hidden ? 'none' : w.style.visibility === 'hidden' ? 'unseen' : w.textContent.trim() }; });
    const s0 = await st();
    const shot = async n => { await p.evaluate(() => document.querySelectorAll('body *').forEach(el => { const ps = getComputedStyle(el).position; if (ps === 'sticky' || ps === 'fixed') el.style.position = 'static'; }));
      const y = await p.evaluate(() => document.querySelector('#weekSec > h2').getBoundingClientRect().top + scrollY - 10); await p.evaluate(y => scrollTo(0, y), Math.max(0, y)); await p.waitForTimeout(300);
      const y2 = await p.evaluate(() => document.querySelector('#weekSec > h2').getBoundingClientRect().top - 10); await p.screenshot({ path: `probe/out-eye-${vw}-${n}.png`, clip: { x: 0, y: Math.max(0, y2), width: vw, height: 120 } }); };
    if (vw === 412) await shot('off');
    await p.click('#weekComps .qeye'); await p.waitForTimeout(1200);
    const s1 = await st(); if (vw === 412) await shot('on');
    await p.click('#weekComps .qeye'); await p.waitForTimeout(1200);
    const s2 = await st();
    out.push(`${vw}: ${s0.kinds} | eye ${s0.eye} faded ${s0.faded} dots ${s0.dots} note ${s0.note}\n   eye tapped: eye ${s1.eye} faded ${s1.faded} dots ${s1.dots} same ${s1.x === s0.x && s1.w === s0.w}\n   again: eye ${s2.eye} faded ${s2.faded} dots ${s2.dots} same ${s2.x === s0.x && s2.w === s0.w}${errs.length ? '\n   ERR ' + errs.join('; ') : ''}`);
  } catch (e) { out.push(`${vw}: error ${e.message.split('\n')[0]}`); }
  await ctx.close();
}
await b.close();
writeFileSync('probe/out.txt', 'live594\n' + out.join('\n') + '\n');
