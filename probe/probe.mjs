// stm: a mock-up of the regrouped stats page (unpushed copy) with made-up numbers, on the live site's fonts; nothing real
// is read from the stats server
import { chromium } from 'playwright'; import { execSync } from 'child_process'; import { writeFileSync, readFileSync, mkdirSync } from 'fs';
const out = ['stm ' + new Date().toISOString()]; mkdirSync('probe/stm/shots', { recursive: true });
const NEW = readFileSync('probe/stm/stats-new.html', 'utf8'), FAKE = readFileSync('probe/stm/fake.json', 'utf8');
const b = await chromium.launch({ channel: 'chrome' });
for (const vw of [1280, 820, 412]) {
  const ctx = await b.newContext({ viewport: { width: vw, height: 900 }, deviceScaleFactor: 2 }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-11-07T07:00:00Z') });
  await p.route(/^https:\/\/kickoff\.kiwi\/stats\.html/, r => r.fulfill({ body: NEW, contentType: 'text/html; charset=utf-8' }));
  await p.route(/kickoff-api\.kickoffkiwi\.workers\.dev/, r => r.fulfill({ body: FAKE, contentType: 'application/json' }));
  await p.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); localStorage.setItem('sf.statspw', '"mock"'); localStorage.setItem('sf.statsDays', '7'); } catch (e) {} });
  try {
    await p.goto('https://kickoff.kiwi/stats.html?x=' + Date.now(), { waitUntil: 'load' }); await p.waitForTimeout(3500);
    const y = id => p.evaluate(i => Math.round(document.getElementById(i).getBoundingClientRect().top + scrollY), id);
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    const shot = async (name, from, to) => { await p.screenshot({ path: `probe/stm/shots/${name}-${vw}.png`, fullPage: true, clip: { x: 0, y: from, width: vw, height: Math.min(to, H) - from } }); };
    const gp = await y('g-popular'), gv = await y('g-people'), gh = await y('g-health'), gd = await y('g-data');
    if (vw !== 820) await shot('top', 0, gp - 8);
    await shot('popular', gp - 12, gv - 8);
    if (vw === 1280) await shot('groups', gv - 12, gd - 8);
    if (vw === 412) await shot('visitors', gv - 12, Math.min(gv + 2600, gd));
    // the bar while scrolled, and the Sections menu open over the page
    await p.evaluate(() => scrollTo(0, 2600)); await p.waitForTimeout(400);
    await p.click('#jumpBtn'); await p.waitForTimeout(400);
    await p.screenshot({ path: `probe/stm/shots/menu-${vw}.png` });
    out.push(`${vw}: height ${H}, groups at ${gp}/${gv}/${gh}/${gd}, fonts ${await p.evaluate(() => document.fonts.status)} ${errs.join('; ')}`);
  } catch (er) { out.push(`${vw} err ${String(er.message).slice(0, 120)}`); }
  await ctx.close();
}
await b.close(); writeFileSync('probe/out-stm.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/stm/shots probe/out-stm.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
