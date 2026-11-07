// one614: ONE Championship in the live feed (names, dates, flags only; no results) and the MMA line on the live site
import { chromium } from 'playwright'; import { execSync } from 'child_process'; import { writeFileSync } from 'fs';
const out = ['one614 ' + new Date().toISOString()];
try {
  const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now(), { signal: AbortSignal.timeout(20000) })).json();
  const one = (f.events || []).filter(e => e.team === 'onefc');
  out.push(`generated ${f.generated || f.updated || ''}; ONE cards ${one.length}`);
  for (const e of one) out.push([e.comp, e.startUTC, e.timeTBC ? 'TBC' : 'time', e.status === 'final' ? 'done' : e.status, e.nzEvent ? 'NZ' : '', (e.tags || []).join(','), e.broadcast || '', e.watchAlt || '', (e.card || []).length + ' bouts'].join(' | '));
  const d = f.diag || {}; for (const k of Object.keys(d).filter(k => /one/i.test(k))) out.push(`diag ${k}: ${String(d[k]).slice(0, 160)}`);
} catch (e) { out.push('feed err ' + e.message); }
const b = await chromium.launch({ channel: 'chrome' });
for (const vw of [1280, 412]) {
  const ctx = await b.newContext({ viewport: { width: vw, height: 900 }, deviceScaleFactor: 2 }); const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); } catch (e) {} });
  try {
    await p.goto('https://kickoff.kiwi/?x=' + Date.now(), { waitUntil: 'load' }); await p.waitForTimeout(2000);
    await p.click('#sportFilter [data-sport="mma"]'); await p.waitForTimeout(1200);
    await p.evaluate(() => document.querySelectorAll('body *').forEach(el => { const ps = getComputedStyle(el).position; if (ps === 'sticky' || ps === 'fixed') el.style.position = 'static'; }));
    await p.locator('#weekSec > h2').screenshot({ path: `probe/out-one-week-${vw}.png` });
    out.push(`${vw} buttons: ${await p.evaluate(() => [...document.querySelectorAll('#weekSec .qcs [data-bigcomp]')].map(x => x.dataset.bigcomp).join(', '))}`);
  } catch (e) { out.push(`${vw} err ${String(e.message).slice(0, 80)}`); }
  await ctx.close();
}
await b.close(); writeFileSync('probe/out-one614.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -f probe/out-one614.txt probe/out-one-week-*.png && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
