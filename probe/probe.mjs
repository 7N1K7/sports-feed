// nc: the live feed, and the series row's chip names at four widths (names only, no scores)
import { chromium } from 'playwright'; import { execSync } from 'child_process'; import { writeFileSync } from 'fs';
const out = ['nc ' + new Date().toISOString()], now = Date.now();
try { const t = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + now)).text(); writeFileSync('probe/out-feed.json', t); out.push('feed saved ' + t.length); } catch (er) { out.push('feed err ' + String(er.message).slice(0, 100)); }
const b = await chromium.launch({ channel: 'chrome' });
for (const w of [360, 412, 800, 1280]) try {
  const p = await (await b.newContext({ viewport: { width: w, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); } catch (e) {} });
  await p.goto('https://kickoff.kiwi/?x=' + now, { waitUntil: 'load' }); await p.waitForTimeout(4000);
  const r = await p.evaluate(() => { const c = [...document.querySelectorAll('#nowChips .nowchip')]; return { n: c.length, names: c.map(x => x.textContent.trim()).join(' | '), rows: new Set(c.map(x => x.offsetTop)).size }; });
  out.push(`${w}: ${r.n} chips, ${r.rows} rows: ${r.names}; errors=${errs.length}`);
} catch (er) { out.push('err ' + String(er.message).slice(0, 160)); }
await b.close(); writeFileSync('probe/out-nc.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/out-nc.txt probe/out-feed.json && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
