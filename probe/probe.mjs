// nc2: the series row on the live site, as it is and with the Nations Championship's whole name (shots of the row only)
import { chromium } from 'playwright'; import { execSync } from 'child_process'; import { writeFileSync } from 'fs';
const out = ['nc2 ' + new Date().toISOString()], now = Date.now();
const b = await chromium.launch({ channel: 'chrome' });
for (const w of [360, 412, 800, 1280]) try {
  const phone = w < 500;
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 2, isMobile: phone, hasTouch: phone });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); } catch (e) {} });
  await p.goto('https://kickoff.kiwi/?x=' + now, { waitUntil: 'load' }); await p.waitForTimeout(5000);
  const bar = await p.$('#nowBar'); await bar.screenshot({ path: `probe/out-nc-old-${w}.png` });
  const n = await p.evaluate(() => { let k = 0; for (const t of document.querySelectorAll('#nowChips .tbt')) if (t.textContent === 'Nations Champ.') { t.textContent = 'Nations Championship'; k++; } return k; });
  await p.waitForTimeout(400); await bar.screenshot({ path: `probe/out-nc-new-${w}.png` });
  out.push(`${w}: renamed ${n}; errors=${errs.length}`);
  await ctx.close();
} catch (er) { out.push('err ' + String(er.message).slice(0, 160)); }
await b.close(); writeFileSync('probe/out-nc2.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/out-nc2.txt probe/out-nc-*.png && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
