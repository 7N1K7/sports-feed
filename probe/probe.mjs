import { writeFileSync } from 'fs';
import { chromium } from 'playwright';
const out = [];
// v593 live: the faded button for a competition that's off in Settings (the NBA), on This week's line with Basketball picked
const b = await chromium.launch({ channel: 'chrome' });
for (const vw of [1280, 820, 412, 360]) {
  const ctx = await b.newContext({ viewport: { width: vw, height: 900 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); localStorage.setItem('sf.sport', '["basketball"]'); localStorage.setItem('sf.comp', '""'); } catch (e) {} });
  try {
    await p.goto('https://kickoff.kiwi/?v=' + Date.now(), { waitUntil: 'networkidle', timeout: 45000 });
    await p.waitForSelector('#weekSec > h2', { timeout: 15000 }); await p.waitForTimeout(1500);
    const st = () => p.evaluate(() => {
      const box = document.getElementById('weekComps'), off = box?.querySelector('.is-off'), r = box?.getBoundingClientRect();
      const note = document.getElementById('offWeek'), here = document.getElementById('hereWeek'), w = document.getElementById('offWeekW');
      return { has: !!box, kids: box ? [...box.children].map(x => (x.classList.contains('is-off') ? 'off:' : '') + (x.getAttribute('aria-label') || x.title || '').split(':')[0]).join(', ') : '',
        filt: off ? getComputedStyle(off).filter : '-', dash: off ? getComputedStyle(off).borderTopStyle : '-', words: !w.hidden && !note.hidden && w.style.visibility !== 'hidden' ? note.textContent.trim() : '(none)',
        here: !w.hidden && !here.hidden ? here.textContent.trim() : '(none)', x: Math.round(r?.left || 0), w: Math.round(r?.width || 0),
        overlap: !!(r && !w.hidden && w.style.visibility !== 'hidden' && r.right > w.getBoundingClientRect().left - 4) };
    });
    const s0 = await st();
    let line = `${vw}: ${s0.kids} | faded ${s0.filt} ${s0.dash} | words ${s0.words} | here ${s0.here}${s0.overlap ? ' OVERLAP' : ''}`;
    if (vw === 412 || vw === 1280) {
      await p.evaluate(() => document.querySelectorAll('body *').forEach(el => { const ps = getComputedStyle(el).position; if (ps === 'sticky' || ps === 'fixed') el.style.position = 'static'; }));
      const y = await p.evaluate(() => document.querySelector('#weekSec > h2').getBoundingClientRect().top + scrollY - 10);
      await p.evaluate(y => scrollTo(0, y), Math.max(0, y)); await p.waitForTimeout(300);
      const y2 = await p.evaluate(() => document.querySelector('#weekSec > h2').getBoundingClientRect().top - 10);
      await p.screenshot({ path: `probe/out-qcoff-${vw}.png`, clip: { x: 0, y: Math.max(0, y2), width: vw, height: 56 } });
    }
    if (await p.$('#weekComps .is-off')) {
      await p.click('#weekComps .is-off'); await p.waitForTimeout(1500);
      const hub = await p.evaluate(() => ({ name: !document.getElementById('hubSec').hidden && document.getElementById('hubName').textContent.trim(), note: !document.getElementById('offHubW').hidden ? document.getElementById('offHub').textContent.trim() : '(none)' }));
      const s1 = await st();
      line += `\n   tapped: page ${hub.name}, its header note "${hub.note}" | line same ${s1.x === s0.x && s1.w === s0.w}`;
      await p.click('#weekComps [aria-pressed="true"]').catch(() => {}); await p.waitForTimeout(1200);
      const s2 = await st(); line += ` | again: closed ${await p.evaluate(() => document.getElementById('hubSec').hidden)}, same ${s2.x === s0.x && s2.w === s0.w}`;
    }
    out.push(line + (errs.length ? '\n   ERR ' + errs.join('; ') : ''));
  } catch (e) { out.push(`${vw}: error ${e.message.split('\n')[0]}`); }
  await ctx.close();
}
await b.close();
writeFileSync('probe/out.txt', 'live593\n' + out.join('\n') + '\n');
