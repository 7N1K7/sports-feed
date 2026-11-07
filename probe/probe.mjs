// two611: the running-series row on the live site at 1197 (1x) and 412 (2x), sf.nocount set: the live dot and the halves
import { chromium } from 'playwright'; import { execSync } from 'child_process'; import { writeFileSync } from 'fs';
const out = ['two611 ' + new Date().toISOString()];
const b = await chromium.launch({ channel: 'chrome' });
for (const [vw, dpr] of [[1197, 1], [412, 2]]) {
  const ctx = await b.newContext({ viewport: { width: vw, height: 900 }, deviceScaleFactor: dpr }); const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); } catch (e) {} });
  await p.goto('https://kickoff.kiwi/?x=' + Date.now(), { waitUntil: 'load' }); await p.waitForSelector('#nowChips .nowchip'); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const n = document.getElementById('nowBar'), q = n.getBoundingClientRect(), c = document.querySelector('#nowChips .nowchip.two'), d = c?.querySelector('.livedot');
    return { bar: [q.x, q.y, q.width, q.height], live: !!c?.classList.contains('is-live'), dot: d ? getComputedStyle(d).opacity : null, ov: c ? getComputedStyle(c).overflow : null, ver: (document.body.innerText.match(/\bv(6\d\d)\b/) || [])[1] }; });
  await p.screenshot({ path: `probe/out-two-${vw}.png`, clip: { x: Math.max(0, r.bar[0]), y: Math.max(0, r.bar[1] - 6), width: Math.min(vw, r.bar[2]), height: r.bar[3] + 12 } });
  out.push(`${vw}: ${JSON.stringify(r)}`); await ctx.close();
}
await b.close(); writeFileSync('probe/out-two.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -f probe/out-two.txt probe/out-two-*.png && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
