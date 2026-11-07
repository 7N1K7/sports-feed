// stl: checks the live stats page (v622) with made-up numbers only: each chart look, the new graphs, no errors
import { chromium } from 'playwright'; import { execSync } from 'child_process'; import { writeFileSync, readFileSync, mkdirSync } from 'fs';
const out = ['stl ' + new Date().toISOString()]; mkdirSync('probe/stl', { recursive: true });
const FAKE = readFileSync('probe/stm/fake.json', 'utf8');
const b = await chromium.launch({ channel: 'chrome' });
try {
  for (const [vw, look] of [[1280, 'kiwi'], [1280, 'neon'], [1280, 'twilight'], [1280, 'rata'], [1280, 'bush'], [1280, 'mono'], [412, 'kiwi'], [360, 'kiwi'], [800, 'kiwi']]) {
    const ctx = await b.newContext({ viewport: { width: vw, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route(/kickoff-api\.kickoffkiwi\.workers\.dev/, r => r.fulfill({ body: FAKE, contentType: 'application/json' }));
    await p.addInitScript(([l]) => { try { localStorage.setItem('sf.nocount', 'true'); localStorage.setItem('sf.statspw', '"mock"'); localStorage.setItem('sf.statsDays', '14'); localStorage.setItem('sf.statsChart', JSON.stringify(l)); } catch (e) {} }, [look]);
    await p.goto('https://kickoff.kiwi/stats.html?x=' + Date.now(), { waitUntil: 'load' }); await p.waitForTimeout(3500);
    const r = await p.evaluate(() => ({ chart: document.documentElement.dataset.chart || '', style: document.documentElement.dataset.cstyle || '', looks: document.querySelectorAll('#looks .lk').length, heat: document.querySelectorAll('#heat i').length, act: document.querySelectorAll('#act polyline').length, tiles: (document.querySelector('.tiles') || { children: [] }).children.length, spk: document.querySelectorAll('.rank .spk').length, share: document.querySelectorAll('.share .sb').length, wide: document.documentElement.scrollWidth > innerWidth }));
    out.push(`${vw} ${look}: chart=${r.chart} style=${r.style} looks=${r.looks} heatcells=${r.heat} actlines=${r.act} tiles=${r.tiles} trends=${r.spk} sharebars=${r.share} sideScroll=${r.wide} errors=${errs.length ? errs.join('; ').slice(0, 200) : 'none'}`);
    if (vw === 1280 && look === 'neon') await p.screenshot({ path: 'probe/stl/neon-top.png' });
    if (vw === 412) await p.screenshot({ path: 'probe/stl/phone-top.png' });
    await ctx.close();
  }
} catch (er) { out.push('err ' + String(er.message).slice(0, 160)); }
await b.close(); writeFileSync('probe/out-stl.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/stl probe/out-stl.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
