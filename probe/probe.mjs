// stv: mock-ups of the stats page's chart looks and new graphs (unpushed copy), made-up numbers only, the site's fonts
import { chromium } from 'playwright'; import { execSync } from 'child_process'; import { writeFileSync, readFileSync, mkdirSync } from 'fs';
const out = ['stv ' + new Date().toISOString()]; mkdirSync('probe/stv', { recursive: true });
const NEW = readFileSync('probe/stm/stats-new2.html', 'utf8'), FAKE = readFileSync('probe/stm/fake.json', 'utf8');
const b = await chromium.launch({ channel: 'chrome' });
const page = async (vw, look, days = '14') => {
  const ctx = await b.newContext({ viewport: { width: vw, height: 900 }, deviceScaleFactor: 2 }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-11-07T07:00:00Z') });
  await p.route(/^https:\/\/kickoff\.kiwi\/stats\.html/, r => r.fulfill({ body: NEW, contentType: 'text/html; charset=utf-8' }));
  await p.route(/kickoff-api\.kickoffkiwi\.workers\.dev/, r => r.fulfill({ body: FAKE, contentType: 'application/json' }));
  await p.addInitScript(([l, d]) => { try { localStorage.setItem('sf.nocount', 'true'); localStorage.setItem('sf.statspw', '"mock"'); localStorage.setItem('sf.statsDays', d); localStorage.setItem('sf.statsChart', JSON.stringify(l)); } catch (e) {} }, [look, days]);
  await p.goto('https://kickoff.kiwi/stats.html?x=' + Date.now(), { waitUntil: 'load' }); await p.waitForTimeout(3500);
  const top = sel => p.evaluate(s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : 0; }, sel);
  const bot = sel => p.evaluate(s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().bottom + scrollY) : 0; }, sel);
  const shot = async (name, y0, y1) => p.screenshot({ path: `probe/stv/${name}.png`, fullPage: true, clip: { x: 0, y: y0, width: vw, height: y1 - y0 } });
  return { p, ctx, errs, top, bot, shot };
};
try {
  for (const look of ['kiwi', 'neon', 'twilight', 'rata', 'bush', 'mono']) {
    const { ctx, errs, top, bot, shot } = await page(1280, look);
    const y0 = (await top('#chart')) - 60, y1 = (await bot('#heat')) + 70;
    await shot(`look-${look}`, y0, y1);
    if (look === 'neon' || look === 'twilight') { const a = (await top('#p-used')) - 50, z = (await bot('#p-comp')) + 60; await shot(`pop-${look}`, a, z); }
    out.push(`${look}: ${errs.join('; ') || 'ok'}`); await ctx.close();
  }
  { const { ctx, errs, top, bot, shot } = await page(1280, 'kiwi');
    await shot('overview-1280', 0, (await bot('#heat')) + 70);
    await shot('visitors-1280', (await top('#g-people')) - 10, (await top('#g-use')) - 8);
    await shot('activity-1280', (await top('#g-use')) - 10, (await bot('#act')) + 70);
    await shot('settings-1280', (await top('#g-set')) - 10, (await top('#g-health')) - 8);
    out.push(`1280 kiwi: ${errs.join('; ') || 'ok'}`); await ctx.close(); }
  { const { p, ctx, errs, top, bot, shot } = await page(412, 'kiwi');
    await shot('phone-top', 0, (await bot('#heat')) + 70);
    await shot('phone-visitors', (await top('#g-people')) - 10, (await top('#g-people')) + 1900);
    await p.evaluate(() => document.getElementById('looks').scrollIntoView({ block: 'center' }));
    await shot('phone-looks', (await top('#g-device')) - 10, (await bot('#looks')) + 90);
    out.push(`412 kiwi: ${errs.join('; ') || 'ok'}`); await ctx.close(); }
} catch (er) { out.push('err ' + String(er.message).slice(0, 160)); }
await b.close(); writeFileSync('probe/out-stv.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/stv probe/out-stv.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
