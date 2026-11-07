// stl2: checks the live stats page's Theme menu (v624) with made-up numbers only
import { chromium } from 'playwright'; import { execSync } from 'child_process'; import { writeFileSync, readFileSync } from 'fs';
const out = ['stl2 ' + new Date().toISOString()];
const FAKE = readFileSync('probe/stm/fake.json', 'utf8');
const b = await chromium.launch({ channel: 'chrome' });
try {
  for (const vw of [1280, 800, 412, 360]) {
    const ctx = await b.newContext({ viewport: { width: vw, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/kickoff-api\.kickoffkiwi\.workers\.dev/, r => r.fulfill({ body: FAKE, contentType: 'application/json' }));
    await p.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); localStorage.setItem('sf.statspw', '"mock"'); localStorage.setItem('sf.statsDays', '14'); } catch (e) {} });
    await p.goto('https://kickoff.kiwi/stats.html?x=' + Date.now(), { waitUntil: 'load' }); await p.waitForTimeout(3500);
    const ver = await p.evaluate(() => (document.body.innerText.match(/\bv\d{3,}\b/) || [''])[0]);
    const has = await p.$('#lookBtn');
    let r = 'no Theme button';
    if (has) {
      const pos = () => p.evaluate(() => [...document.querySelectorAll('#tbar .tbrow > *')].map(x => Math.round(x.getBoundingClientRect().left)).join(','));
      const p0 = await pos(); await p.click('#lookBtn'); await p.waitForTimeout(300); const p1 = await pos();
      const m = await p.evaluate(() => { const m = document.getElementById('lookMenu'); const rows = sel => { const ys = [...m.querySelectorAll(sel)].map(x => Math.round(x.getBoundingClientRect().top)); return [...new Set(ys)].map(y => ys.filter(v => v === y).length).join('/'); };
        return { open: !m.hidden, themes: rows('.sw'), looks: rows('.lk'), clipped: [...m.querySelectorAll('.sw, .lk')].filter(x => x.scrollWidth > x.clientWidth + 1).length, wide: document.documentElement.scrollWidth > innerWidth }; });
      await p.click('#lookMenu [data-theme-k="ocean"]'); await p.waitForTimeout(300); await p.click('#lookMenu [data-look="bush"]'); await p.waitForTimeout(300);
      const st = await p.evaluate(() => [!document.getElementById('lookMenu').hidden, document.documentElement.dataset.accent, document.documentElement.dataset.chart, document.querySelector('#themes [aria-pressed="true"]')?.dataset.themeK, document.querySelector('#looks [aria-pressed="true"]')?.dataset.look].join(','));
      await p.keyboard.press('Escape'); await p.waitForTimeout(200); const closed = await p.evaluate(() => document.getElementById('lookMenu').hidden);
      r = `open=${m.open} rows themes ${m.themes} looks ${m.looks} clipped=${m.clipped} sideScroll=${m.wide} barStill=${p0 === p1} picked(open,theme,chart,card theme,card look)=${st} escCloses=${closed}`;
    }
    out.push(`${vw} ${ver}: ${r} errors=${errs.length ? errs.join('; ').slice(0, 200) : 'none'}`); await ctx.close();
  }
} catch (er) { out.push('err ' + String(er.message).slice(0, 160)); }
await b.close(); writeFileSync('probe/out-stl2.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/out-stl2.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
