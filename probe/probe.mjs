// wc: mock-ups of where to watch centred in a game's pop-up (unpushed copy) against the live site; form blurred, spoilers on
import { chromium } from 'playwright'; import { execSync } from 'child_process'; import { writeFileSync, readFileSync, mkdirSync } from 'fs';
const out = ['wc2 ' + new Date().toISOString()]; mkdirSync('probe/wc2', { recursive: true });
const NEW = readFileSync('probe/wc2/index-new.html', 'utf8');
const BLUR = '#sheetBody [class*="form"], #sheetBody .score, #sheetBody .dres { filter: blur(7px) !important }';
const b = await chromium.launch({ channel: 'chrome' });
try {
  for (const g of ['bc-ind-odi3-2026', 'wbbl-12-m14-brisbane-heat-v-hobart-hurricanes'])
  for (const vw of [1280, 412]) for (const which of ['new']) {
    const ctx = await b.newContext({ viewport: { width: vw, height: vw > 500 ? 1000 : 900 }, deviceScaleFactor: 2 }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    if (which === 'new') await p.route(/^https:\/\/kickoff\.kiwi\/(index\.html)?(\?[^#]*)?$/, r => r.fulfill({ body: NEW, contentType: 'text/html; charset=utf-8' }));
    await p.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); } catch (e) {} });
    await p.goto('https://kickoff.kiwi/?x=' + Date.now() + '#g=' + g, { waitUntil: 'load' }); await p.waitForTimeout(4500);
    await p.addStyleTag({ content: BLUR });
    const ok = await p.evaluate(() => !!document.querySelector('#sheetBody .watchlist'));
    if (ok) {
      await p.evaluate(() => [...document.querySelectorAll('#sheetBody .dh')].find(x => /watch in nz/i.test(x.textContent))?.scrollIntoView({ block: 'start' }));
      await p.evaluate(() => { const h = [...document.querySelectorAll('#sheetBody .dh')].find(x => /watch in nz/i.test(x.textContent)); const sc = (el => { while (el && el !== document.body) { const s = getComputedStyle(el); if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight) return el; el = el.parentElement; } return null; })(h); if (sc) sc.scrollTop += h.getBoundingClientRect().top - sc.getBoundingClientRect().top - 330; });
      await p.waitForTimeout(400);
      const box = await p.evaluate(() => { const d = document.querySelector('#sheetBody').closest('dialog, .sheet, [role="dialog"]') || document.querySelector('#sheetBody'); const r = d.getBoundingClientRect(); return { x: Math.max(0, r.left), y: Math.max(0, r.top), w: Math.min(innerWidth, r.width), h: Math.min(innerHeight - Math.max(0, r.top), r.height) }; });
      await p.screenshot({ path: `probe/wc2/${g.slice(0, 14)}-${vw}-${which}.png`, clip: { x: box.x, y: box.y, width: box.w, height: box.h } });
    }
    out.push(`${g} ${vw} ${which}: ${ok ? 'ok' : 'no watch list'} errors=${errs.join('; ').slice(0, 160) || 'none'}`); await ctx.close();
  }
} catch (er) { out.push('err ' + String(er.message).slice(0, 160)); }
await b.close(); writeFileSync('probe/out-wc2.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/wc2 probe/out-wc2.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
