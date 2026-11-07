// lv: checks the live site (v626): where to watch centred in a pop-up, and games joining Live now ten minutes before
import { chromium } from 'playwright'; import { execSync } from 'child_process'; import { writeFileSync } from 'fs';
const out = ['lv ' + new Date().toISOString()];
const b = await chromium.launch({ channel: 'chrome' });
try {
  for (const vw of [1280, 412]) {
    const ctx = await b.newContext({ viewport: { width: vw, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); } catch (e) {} });
    const res = await p.goto('https://kickoff.kiwi/?x=' + Date.now() + '#g=bc-ind-odi3-2026', { waitUntil: 'load' }); await p.waitForTimeout(4500);
    const src = await res.text();
    const r = await p.evaluate(() => { const sb = document.getElementById('sheetBody'); const w = sb?.querySelector(':scope > .watchlist'); if (!w) return 'no watch list';
      const a = sb.getBoundingClientRect(), x = w.getBoundingClientRect(), h = [...sb.querySelectorAll(':scope > .dh')].map(d => getComputedStyle(d).textAlign);
      const lefts = [...w.querySelectorAll('li.wopt > div')].map(d => Math.round(d.getBoundingClientRect().left)); return `watch margins ${Math.round(x.left - a.left)}/${Math.round(a.right - x.right)} channels start together ${new Set(lefts).size === 1} headings ${[...new Set(h)].join(',')}`; });
    const ver = await p.evaluate(() => (document.body.innerText.match(/\bv\d{3,}\b/) || [''])[0]);
    out.push(`${vw}: page ${ver || '?'} soon10=${/const SOON = 10 \* 6e4/.test(src)} ${r} errors=${errs.join('; ').slice(0, 160) || 'none'}`); await ctx.close();
  }
} catch (er) { out.push('err ' + String(er.message).slice(0, 160)); }
await b.close(); writeFileSync('probe/out-lv.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/out-lv.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
