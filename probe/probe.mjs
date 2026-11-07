// stt: mock-ups of the stats page's Theme menu in the top bar (unpushed copy), made-up numbers only, the site's fonts
import { chromium } from 'playwright'; import { execSync } from 'child_process'; import { writeFileSync, readFileSync, mkdirSync } from 'fs';
const out = ['stt ' + new Date().toISOString()]; mkdirSync('probe/stt', { recursive: true });
const NEW = readFileSync('probe/stm/stats-new3.html', 'utf8'), FAKE = readFileSync('probe/stm/fake.json', 'utf8');
const b = await chromium.launch({ channel: 'chrome' });
try {
  for (const vw of [1280, 800, 412, 360]) {
    const ctx = await b.newContext({ viewport: { width: vw, height: 900 }, deviceScaleFactor: 2 }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.clock.install({ time: new Date('2026-11-07T07:00:00Z') });
    await p.route(/^https:\/\/kickoff\.kiwi\/stats\.html/, r => r.fulfill({ body: NEW, contentType: 'text/html; charset=utf-8' }));
    await p.route(/kickoff-api\.kickoffkiwi\.workers\.dev/, r => r.fulfill({ body: FAKE, contentType: 'application/json' }));
    await p.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); localStorage.setItem('sf.statspw', '"mock"'); localStorage.setItem('sf.statsDays', '14'); localStorage.setItem('sf.statsChart', '"kiwi"'); localStorage.setItem('sf.statsAccent', '"green"'); } catch (e) {} });
    await p.goto('https://kickoff.kiwi/stats.html?x=' + Date.now(), { waitUntil: 'load' }); await p.waitForTimeout(3500);
    const h = vw > 500 ? 760 : 900;
    await p.screenshot({ path: `probe/stt/bar-${vw}.png`, clip: { x: 0, y: 0, width: vw, height: vw > 500 ? 300 : 340 } });
    await p.click('#lookBtn'); await p.waitForTimeout(400);
    const mh = await p.evaluate(() => Math.round(document.getElementById('lookMenu').getBoundingClientRect().bottom));
    const clipped = await p.evaluate(() => [...document.querySelectorAll('#lookMenu .sw, #lookMenu .lk')].filter(x => x.scrollWidth > x.clientWidth + 1).map(x => x.textContent).join('|'));
    await p.screenshot({ path: `probe/stt/open-${vw}.png`, clip: { x: 0, y: 0, width: vw, height: Math.min(900, mh + 24) } });
    if (vw === 1280 || vw === 412) {
      await p.click('#lookMenu [data-theme-k="ocean"]'); await p.waitForTimeout(400); await p.click('#lookMenu [data-look="twilight"]'); await p.waitForTimeout(600);
      await p.screenshot({ path: `probe/stt/picked-${vw}.png`, clip: { x: 0, y: 0, width: vw, height: 900 } });
    }
    out.push(`${vw}: menu bottom ${mh} clipped=[${clipped}] errors=${errs.join('; ') || 'none'}`); await ctx.close();
  }
} catch (er) { out.push('err ' + String(er.message).slice(0, 160)); }
await b.close(); writeFileSync('probe/out-stt.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/stt probe/out-stt.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
