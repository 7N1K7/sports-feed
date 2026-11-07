// v615: the live site's pop-up (facts and links centred) and the MMA line, sf.nocount set; form, scores blurred
import { chromium } from 'playwright'; import { execSync } from 'child_process'; import { writeFileSync, mkdirSync } from 'fs';
const out = ['v615 ' + new Date().toISOString()]; mkdirSync('probe/v615', { recursive: true });
const b = await chromium.launch({ channel: 'chrome' });
for (const vw of [1280, 412]) for (const id of ['bc-ind-odi2-2026', 'wiki-onefc-onefightnight49']) {
  const ctx = await b.newContext({ viewport: { width: vw, height: 1000 }, deviceScaleFactor: 2 }); const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); } catch (e) {} });
  try {
    await p.goto(`https://kickoff.kiwi/?x=${Date.now()}#g=${id}`, { waitUntil: 'load', timeout: 30000 });
    await p.waitForFunction(() => document.getElementById('sheet')?.open, null, { timeout: 15000 });
    await p.addStyleTag({ content: '#sheet .form, #sheet .fd, #sheet .ts, #sheet .dres, #sheet .cover { filter: blur(6px) } #sheet .close:focus-visible { outline: none }' });
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => { const d = document.getElementById('sheet').getBoundingClientRect(), w = [...document.querySelectorAll('#sheetBody .dh')].find(h => /watch in/i.test(h.textContent)), f = document.querySelector('#sheetBody > .facts')?.getBoundingClientRect(), b = document.querySelector('#sheetBody > .dlinks'), br = b?.querySelectorAll('br').length;
      return { d: [d.x, d.y, d.width, d.height], wb: w ? w.getBoundingClientRect().bottom : d.y + 600, facts: f && [Math.round(f.left - d.left), Math.round(d.right - f.right)], br, ver: (document.body.innerText.match(/\bv(6\d\d)\b/) || [])[1] || '' }; });
    await p.screenshot({ path: `probe/v615/${vw}-${id.slice(0, 12)}.png`, clip: { x: r.d[0], y: r.d[1], width: r.d[2], height: Math.min(r.d[3], r.wb - r.d[1] + 40) } });
    out.push(`${vw} ${id.slice(0, 12)} facts gaps ${JSON.stringify(r.facts)} link breaks ${r.br} ${r.ver}`);
  } catch (e) { out.push(`${vw} ${id.slice(0, 12)} fail ${String(e.message).slice(0, 60)}`); }
  await ctx.close();
}
{ const ctx = await b.newContext({ viewport: { width: 412, height: 900 } }); const p = await ctx.newPage(); await p.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); } catch (e) {} });
  try { await p.goto('https://kickoff.kiwi/?x=' + Date.now(), { waitUntil: 'load' }); await p.waitForTimeout(2000); await p.click('#sportFilter [data-sport="mma"]'); await p.waitForTimeout(1000);
    out.push('MMA line: ' + await p.evaluate(() => [...document.querySelectorAll('#weekSec .qcs [data-bigcomp]')].map(x => x.dataset.bigcomp + (x.classList.contains('is-off') ? ' (off)' : '')).join(', ')) + ' | ONE cards listed: ' + await p.evaluate(() => [...document.querySelectorAll('.ev')].filter(x => /ONE/.test(x.textContent)).length));
  } catch (e) { out.push('mma fail ' + e.message.slice(0, 60)); } await ctx.close(); }
await b.close(); writeFileSync('probe/out-v615.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/v615 probe/out-v615.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
