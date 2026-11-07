// nc8: Nations Cup sides by country names: the live page and this branch's, card views and the pop-up head (no scores)
import { chromium } from 'playwright'; import { execSync } from 'child_process'; import { writeFileSync, readFileSync } from 'fs';
const out = ['nc8 ' + new Date().toISOString()], now = Date.now(), PAGE = readFileSync('probe/nc-index.html', 'utf8');
const ID = 'wiki-nationscup-2026-11-07-portugalchile';
const b = await chromium.launch({ channel: 'chrome' });
for (const which of ['old', 'new']) for (const [w, view] of [[1280, 'mixed'], [412, 'mixed'], [412, 'list']]) try {
  const phone = w < 500, ctx = await b.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 2, isMobile: phone, hasTouch: phone });
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(v => { try { localStorage.setItem('sf.nocount', 'true'); localStorage.setItem('sf.view', JSON.stringify(v)); } catch (e) {} }, view);
  if (which === 'new') await p.route(u => /^https:\/\/kickoff\.kiwi\/(index\.html)?(\?|#|$)/.test(u.href), r => r.fulfill({ body: PAGE, contentType: 'text/html' }));
  await p.goto('https://kickoff.kiwi/?x=' + now, { waitUntil: 'load' }); await p.waitForTimeout(5000);
  await p.addStyleTag({ content: '.form, .fm, .dform, .score, .res, .sres, [class*="form"] { filter: blur(6px) !important }' });
  const c = await p.$(`[data-open="${ID}"]`);
  if (c) { await c.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await c.screenshot({ path: `probe/out-ncn-${which}-${view}-${w}.png` }); }
  const names = await p.evaluate(() => [...document.querySelectorAll('[data-open^="wiki-nationscup"]')].slice(0, 6).map(x => [...x.querySelectorAll('.nm')].map(n => n.textContent).join(' v ')).join(' | '));
  out.push(`${which} ${view} ${w}: ${names}; errors=${errs.length}`);
  if (view === 'mixed') {
    await p.goto('https://kickoff.kiwi/?x=' + now + '#g=' + ID, { waitUntil: 'load' }); await p.waitForTimeout(4000);
    const h = await p.$('#sheetBody .sheet-head'); if (h) await h.screenshot({ path: `probe/out-ncn-${which}-pop-${w}.png` });
  }
  await ctx.close();
} catch (er) { out.push(which + ' err ' + String(er.message).slice(0, 160)); }
await b.close(); writeFileSync('probe/out-nc8.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/out-nc8.txt probe/out-ncn-*.png && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
