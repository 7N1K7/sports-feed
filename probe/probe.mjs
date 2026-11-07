// tbl609: the Nations Championship's Table tab on the live site at 1197 and 860 wide, rows blurred (no results), sf.nocount set
import { chromium } from 'playwright'; import { execSync } from 'child_process'; import { writeFileSync } from 'fs';
const out = ['tbl609 ' + new Date().toISOString()];
const b = await chromium.launch({ channel: 'chrome' });
for (const vw of [1197, 860]) {
  const ctx = await b.newContext({ viewport: { width: vw, height: 1000 }, deviceScaleFactor: 2 }); const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); localStorage.setItem('sf.comp', JSON.stringify('Nations Championship')); } catch (e) {} });
  await p.goto('https://kickoff.kiwi/?x=' + Date.now(), { waitUntil: 'load' }); await p.waitForSelector('.hubtabs button'); await p.waitForTimeout(1200);
  await p.locator('.hubtabs button', { hasText: /^Table$/ }).click(); await p.waitForTimeout(600);
  await p.addStyleTag({ content: '#hubBody tbody td:not(.pos), #hubBody tbody img { filter: blur(7px) } .totop { display: none !important }' });
  await p.evaluate(() => document.querySelectorAll('body *').forEach(el => { const ps = getComputedStyle(el).position; if (ps === 'sticky' || ps === 'fixed') el.style.position = 'static'; }));
  const r = await p.evaluate(() => { const hub = document.querySelector('.hubtabs').closest('section, .hub, div'); hub.scrollIntoView(); const a = document.querySelector('.hubtabs').getBoundingClientRect(), hb = document.getElementById('hubBody').getBoundingClientRect();
    return { y: a.top - 70, st: [...document.querySelectorAll('#hubBody > .stable')].map(x => { const q = x.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.width)]; }), hb: [Math.round(hb.left), Math.round(hb.width)] }; });
  await p.waitForTimeout(200);
  await p.screenshot({ path: `probe/out-tbl-${vw}.png`, clip: { x: 0, y: Math.max(0, r.y), width: vw, height: vw === 860 ? 1000 : 720 } });
  out.push(`${vw}: hubBody ${JSON.stringify(r.hb)} tables ${JSON.stringify(r.st)}`); await ctx.close();
}
await b.close();
writeFileSync('probe/out-tbl.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -f probe/out-tbl.txt probe/out-tbl-*.png && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
