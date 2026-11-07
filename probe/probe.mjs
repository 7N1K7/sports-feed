// nc5: mock-up shots of the Nations Cup added (this branch's page and a feed with its games, on the live site's images). No scores
import { chromium } from 'playwright'; import { execSync } from 'child_process'; import { writeFileSync, readFileSync } from 'fs';
const out = ['nc5 ' + new Date().toISOString()], now = Date.now();
const PAGE = readFileSync('probe/nc-index.html', 'utf8'), FEED = readFileSync('probe/nc-feed.json', 'utf8');
const ID = 'wiki-nationscup-2026-11-07-spainuruguay', ID2 = 'wiki-nationscup-2026-11-08-hongkongusa';
const b = await chromium.launch({ channel: 'chrome' });
const open = async (w, hash = '') => {
  const phone = w < 500, ctx = await b.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 2, isMobile: phone, hasTouch: phone });
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); } catch (e) {} });
  await p.route(u => /^https:\/\/kickoff\.kiwi\/(index\.html)?(\?|#|$)/.test(u.href), r => r.fulfill({ body: PAGE, contentType: 'text/html' }));
  await p.route(/kickoff\.kiwi\/data\/feed\.json/, r => r.fulfill({ body: FEED, contentType: 'application/json' }));
  await p.goto('https://kickoff.kiwi/?x=' + now + hash, { waitUntil: 'load' }); await p.waitForTimeout(5000);
  await p.addStyleTag({ content: '.form, .fm, .dform, .score, .res, .sres, [class*="form"] { filter: blur(6px) !important }' });
  return { p, ctx, errs };
};
for (const w of [1280, 800, 412, 360]) try {
  const { p, ctx, errs } = await open(w);
  const bar = await p.$('#nowBar'); await bar.screenshot({ path: `probe/out-ncup-bar-${w}.png` });
  const names = await p.evaluate(() => [...document.querySelectorAll('#nowChips .nowchip')].map(x => x.textContent.trim()).join(' | '));
  for (const id of [ID, ID2]) { const c = await p.$(`[data-open="${id}"]`); if (c) { await c.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await c.screenshot({ path: `probe/out-ncup-card-${id.slice(-11)}-${w}.png` }); } }
  if (w === 1280 || w === 412) {
    await p.click('#teamsBtn'); await p.waitForTimeout(700);
    const g = await p.evaluateHandle(() => { const c = document.querySelector('[data-team="nationscup"]'); let el = c; while (el && el.parentElement && !el.parentElement.matches('#panel, body') && el.parentElement.querySelectorAll('[data-team]').length < 40) { if (el.querySelector('[data-team="allblacks"]') && el.querySelector('[data-team="nationscup"]')) break; el = el.parentElement; } return el; });
    await g.asElement()?.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await g.asElement()?.screenshot({ path: `probe/out-ncup-picks-${w}.png` });
  }
  out.push(`${w}: chips ${names}; errors=${errs.length} ${errs.join(';').slice(0, 120)}`);
  await ctx.close();
} catch (er) { out.push(w + ' err ' + String(er.message).slice(0, 160)); }
for (const w of [1280, 412]) try {
  const { p, ctx, errs } = await open(w, '#g=' + ID);
  await p.evaluate(() => [...document.querySelectorAll('#sheetBody .dh')].find(x => /watch in nz/i.test(x.textContent))?.scrollIntoView({ block: 'center' })); await p.waitForTimeout(400);
  await p.screenshot({ path: `probe/out-ncup-pop-${w}.png` });
  const watch = await p.evaluate(() => document.querySelector('#sheetBody .watchlist')?.innerText.replace(/\s+/g, ' ') || '-');
  out.push(`pop-up ${w}: watch: ${watch}; errors=${errs.length}`);
  await ctx.close();
} catch (er) { out.push('pop err ' + String(er.message).slice(0, 160)); }
await b.close(); writeFileSync('probe/out-nc5.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/out-nc5.txt probe/out-ncup-*.png && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
