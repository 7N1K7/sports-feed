// hub: a series row tap on short phone screens with the filters open, the live page and this branch's (no scores)
import { chromium } from 'playwright'; import { execSync } from 'child_process'; import { writeFileSync, readFileSync } from 'fs';
const out = ['hub ' + new Date().toISOString()], now = Date.now(), PAGE = readFileSync('probe/nc-index.html', 'utf8');
const b = await chromium.launch({ channel: 'chrome' });
for (const which of ['old', 'new']) for (const [w, h] of [[360, 640], [412, 700]]) try {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); localStorage.setItem('sf.view', JSON.stringify('mixed')); localStorage.setItem('sf.folded', 'false'); } catch (e) {} });
  if (which === 'new') await p.route(u => /^https:\/\/kickoff\.kiwi\/(index\.html)?(\?|#|$)/.test(u.href), r => r.fulfill({ body: PAGE, contentType: 'text/html' }));
  await p.goto('https://kickoff.kiwi/?x=' + now, { waitUntil: 'load' }); await p.waitForTimeout(5000);
  await p.addStyleTag({ content: '.form, .fm, .dform, .score, .res, .sres, [class*="form"] { filter: blur(6px) !important }' });
  await p.screenshot({ path: `probe/out-hub-${which}-${w}-0.png` });
  await (await p.$('#nowChips .nowchip')).tap(); await p.waitForTimeout(1800);
  await p.screenshot({ path: `probe/out-hub-${which}-${w}-1.png` });
  out.push(`${which} ${w}x${h}: y=${await p.evaluate(() => Math.round(scrollY))} chip=${await p.evaluate(() => document.getElementById('hubName')?.textContent)} errors=${errs.length}`);
  await ctx.close();
} catch (er) { out.push(which + ' err ' + String(er.message).slice(0, 160)); }
await b.close(); writeFileSync('probe/out-hub.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/out-hub.txt probe/out-hub-*.png && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
