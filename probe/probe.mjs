// stl: the live stats page (deployed copy) drawn with the made-up numbers in probe/stm/fake.json; nothing real is read
import { chromium } from 'playwright'; import { execSync } from 'child_process'; import { writeFileSync, readFileSync, mkdirSync } from 'fs';
const out = ['stl ' + new Date().toISOString()]; mkdirSync('probe/stl', { recursive: true });
const FAKE = readFileSync('probe/stm/fake.json', 'utf8');
const b = await chromium.launch({ channel: 'chrome' });
for (const vw of [1280, 412]) {
  const ctx = await b.newContext({ viewport: { width: vw, height: 900 }, deviceScaleFactor: 1 }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-11-07T07:00:00Z') });
  await p.route(/kickoff-api\.kickoffkiwi\.workers\.dev/, r => r.fulfill({ body: FAKE, contentType: 'application/json' }));
  await p.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); localStorage.setItem('sf.statspw', '"mock"'); localStorage.setItem('sf.statsDays', '7'); } catch (e) {} });
  try {
    await p.goto('https://kickoff.kiwi/stats.html?x=' + Date.now(), { waitUntil: 'load' }); await p.waitForTimeout(3500);
    const r = await p.evaluate(() => ({ ver: document.getElementById('ver')?.textContent, bar: !!document.getElementById('tbar'), groups: document.querySelectorAll('.grp').length, menu: document.querySelectorAll('#jump a').length, used: document.querySelectorAll('#p-used li').length, span: document.getElementById('rangeSpan')?.textContent }));
    out.push(`${vw}: ${JSON.stringify(r)} ${errs.join('; ')}`);
    await p.screenshot({ path: `probe/stl/top-${vw}.png` });
  } catch (er) { out.push(`${vw} err ${String(er.message).slice(0, 120)}`); }
  await ctx.close();
}
await b.close(); writeFileSync('probe/out-stl.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/stl probe/out-stl.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
