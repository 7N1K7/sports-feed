// nc3: v628 check, the series row's chip names and rows on the live site (names only, no scores)
import { chromium } from 'playwright'; import { execSync } from 'child_process'; import { writeFileSync } from 'fs';
const out = ['nc3 ' + new Date().toISOString()], now = Date.now();
const b = await chromium.launch({ channel: 'chrome' });
for (const w of [360, 412, 800, 1280]) try {
  const phone = w < 500;
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: phone, hasTouch: phone });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); } catch (e) {} });
  await p.goto('https://kickoff.kiwi/?x=' + now, { waitUntil: 'load' }); await p.waitForTimeout(5000);
  const r = await p.evaluate(() => { const box = document.getElementById('nowChips'), c = [...box.querySelectorAll('.nowchip')];
    return { v: (document.body.innerText.match(/\bv6\d\d\b/) || ['?'])[0], names: c.map(x => x.textContent.trim()).join(' | '), rows: new Set(c.map(x => Math.round(x.getBoundingClientRect().top + x.getBoundingClientRect().height / 2))).size, swipes: box.scrollWidth > box.clientWidth + 2 }; });
  out.push(`${w}: ${r.v}; ${r.names}; rows=${r.rows}; swipes=${r.swipes}; errors=${errs.length}`);
  await ctx.close();
} catch (er) { out.push('err ' + String(er.message).slice(0, 160)); }
await b.close(); writeFileSync('probe/out-nc3.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/out-nc3.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
