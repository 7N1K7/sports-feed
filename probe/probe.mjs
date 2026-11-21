import { writeFileSync } from 'node:fs';
const out = [];
process.on('exit', () => writeFileSync(new URL('./out.txt', import.meta.url), out.join('\n') + '\n'));
try {
  const { chromium } = await import('playwright');
  const b = await chromium.launch({ channel: 'chrome' });
  for (const w of [412, 1280]) {
    const cx = await b.newContext({ viewport: { width: w, height: 900 }, timezoneId: 'Pacific/Auckland', locale: 'en-NZ', deviceScaleFactor: 2 });
    await cx.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); } catch {} });
    const p = await cx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('https://kickoff.kiwi/?' + Date.now(), { waitUntil: 'networkidle' });
    await p.waitForSelector('.nowchip', { timeout: 10000 }).catch(() => {});
    await p.waitForTimeout(1200);
    const chips = await p.evaluate(() => [...document.querySelectorAll('.nowchip')].map(c => `${c.textContent.replace(/\s+/g, ' ').trim()} [${c.getAttribute('aria-label') || c.title}]${c.querySelector('.wline') ? ' W' : ''}`));
    out.push(`${w} v${await p.evaluate(() => document.body.innerText.match(/\bv(\d{3,4})\b/)?.[1])} errors ${errs.length}: ${chips.join(' | ')}`);
    if (w === 412) await p.locator('#nowChips').screenshot({ path: new URL('./out-row.png', import.meta.url).pathname }).catch(e => out.push('shot ' + e.message.slice(0, 80)));
    await cx.close();
  }
  await b.close();
} catch (e) { out.push('browser err ' + e.message.slice(0, 200)); }
