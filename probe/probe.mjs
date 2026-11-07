// mmaw: the live site's This week line after tapping MMA (competition names only), sf.nocount set
import { chromium } from 'playwright'; import { execSync } from 'child_process'; import { writeFileSync, mkdirSync } from 'fs';
const out = ['mmaw ' + new Date().toISOString()]; mkdirSync('probe/mmaw', { recursive: true });
const b = await chromium.launch({ channel: 'chrome' });
for (const vw of [1280, 412]) {
  const ctx = await b.newContext({ viewport: { width: vw, height: 900 }, deviceScaleFactor: 2 }); const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); } catch (e) {} });
  try {
    await p.goto('https://kickoff.kiwi/?x=' + Date.now(), { waitUntil: 'load' }); await p.waitForTimeout(3000);
    const v = await p.evaluate(() => document.querySelector('#ver, .ver, [data-ver]')?.textContent || '');
    await p.click('#sportFilter [data-sport="mma"]'); await p.waitForTimeout(1200);
    const wk = await p.evaluate(() => [...document.querySelectorAll('#weekComps [data-bigcomp]')].map(x => x.dataset.bigcomp));
    out.push(`${vw} ${v}: ${JSON.stringify(wk)}`);
    await p.evaluate(() => document.querySelectorAll('body *').forEach(x => { const ps = getComputedStyle(x).position; if (ps === 'sticky' || ps === 'fixed') x.style.position = 'static'; }));
    const h = await p.$('#weekSec > h2'); if (h) { await h.scrollIntoViewIfNeeded(); await h.screenshot({ path: `probe/mmaw/week-${vw}.png` }); }
    if (vw === 1280 && wk.includes('ONE Championship')) { await p.click('#weekComps [data-bigcomp="ONE Championship"]'); await p.waitForTimeout(1200); out.push('ONE page: ' + await p.evaluate(() => (document.getElementById('hubName')?.innerText || '').replace(/\s+/g, ' ') + ' | further ahead rows ' + document.querySelectorAll('#laterSec .ev, #aheadSec .ev').length)); }
  } catch (er) { out.push(`${vw} err ${String(er.message).slice(0, 100)}`); }
  await ctx.close();
}
await b.close(); writeFileSync('probe/out-mmaw.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/mmaw probe/out-mmaw.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
