// bn: the game pop-up's top on the live site now, and with the competition look behind it, centred (bn-index.html served
// for the page itself; feed, fonts and images live). sf.nocount set; form, scores and results blurred
import { chromium } from 'playwright'; import { execSync } from 'child_process'; import { writeFileSync, mkdirSync, readFileSync } from 'fs';
const out = ['bn ' + new Date().toISOString()]; mkdirSync('probe/bn', { recursive: true });
const NEW = readFileSync('probe/bn-index.html', 'utf8');
const ALL = ['bc-ind-odi2-2026', 'rlwc-m-semi-final-1', 'ab-sco-nz-2026-11-07', 'tsdb-2540125', 'wbbl-12-m13-melbourne-renegades-v-adelaide-strikers', 'wf-ban-odi2-2026', 'tsdb-2601527', 'f1-2026-20', 'wiki-nbl-2026-11-07-adelaideersillawarrahawks'];
const b = await chromium.launch({ channel: 'chrome' });
for (const [tag, ids] of [['now', ALL.slice(0, 2)], ['new', ALL]]) for (const vw of [1280, 412]) for (const id of ids) {
  const ctx = await b.newContext({ viewport: { width: vw, height: 900 }, deviceScaleFactor: 2 }); const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); } catch (e) {} });
  if (tag === 'new') await p.route(/^https:\/\/kickoff\.kiwi\/(\?[^#]*)?$/, r => r.fulfill({ body: NEW, contentType: 'text/html; charset=utf-8' }));
  try {
    await p.goto(`https://kickoff.kiwi/?x=${Date.now()}#g=${id}`, { waitUntil: 'load', timeout: 30000 });
    await p.waitForFunction(() => document.getElementById('sheet')?.open, null, { timeout: 15000 });
    await p.addStyleTag({ content: '#sheet .form, #sheet .fd, #sheet .ts, #sheet .dres, #sheet .cover { filter: blur(6px) } #sheet .close:focus-visible { outline: none }' });
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => { const d = document.getElementById('sheet').getBoundingClientRect(), h = document.querySelector('#sheetBody .sheet-head').getBoundingClientRect(); return { d: [d.x, d.y, d.width, d.height], hb: h.bottom }; });
    const hgt = Math.min(r.d[3], r.hb - r.d[1] + 110);
    await p.screenshot({ path: `probe/bn/${tag}-${vw}-${id.slice(0, 14)}.png`, clip: { x: r.d[0], y: r.d[1], width: r.d[2], height: hgt } });
    out.push(`${tag} ${vw} ${id.slice(0, 14)} ok`);
  } catch (e) { out.push(`${tag} ${vw} ${id.slice(0, 14)} fail ${String(e.message).slice(0, 60)}`); }
  await ctx.close();
}
await b.close(); writeFileSync('probe/out-bn.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -f probe/out-bn.txt probe/bn && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
