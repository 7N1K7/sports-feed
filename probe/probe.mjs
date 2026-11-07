// rainc: the NZ v India ODI's card on the live site in each view: the rain stamp and notes (yes/no, the note's wording
// only), sf.nocount set; the feed's rain fields (no scores)
import { chromium } from 'playwright'; import { execSync } from 'child_process'; import { writeFileSync, mkdirSync } from 'fs';
const out = ['rainc ' + new Date().toISOString()]; mkdirSync('probe/rainc', { recursive: true });
try { const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now(), { signal: AbortSignal.timeout(20000) })).json(); const e = f.events.find(x => x.id === 'bc-ind-odi2-2026');
  out.push(`feed: status ${e?.status} progress ${e?.progress ? 'yes' : 'no'} liveState ${e?.liveState || ''} weather ${e?.weather ? 'yes' : 'no'} wxNews ${e?.wxNews ? 'yes' : 'no'}`); } catch (er) { out.push('feed err ' + er.message); }
const b = await chromium.launch({ channel: 'chrome' });
for (const view of ['', 'compact', 'list']) for (const vw of [1280, 412]) {
  const ctx = await b.newContext({ viewport: { width: vw, height: 1000 }, deviceScaleFactor: 2 }); const p = await ctx.newPage();
  await p.addInitScript(v => { try { localStorage.setItem('sf.nocount', 'true'); if (v) localStorage.setItem('sf.view', JSON.stringify(v)); } catch (e) {} }, view);
  try {
    await p.goto('https://kickoff.kiwi/?x=' + Date.now(), { waitUntil: 'load' }); await p.waitForTimeout(2500);
    const r = await p.evaluate(() => [...document.querySelectorAll('[data-open="bc-ind-odi2-2026"]')].map(c => ({ sec: c.closest('section')?.id || '', cls: c.className.split(' ').filter(x => /lrow|compact|is-live|big/.test(x)).join(' '), stamp: c.querySelector('.rainstamp')?.textContent || '', wx: [...c.querySelectorAll('.wx')].map(w => w.className + ':' + (w.textContent.includes('overs') ? 'overs note' : 'other')).join(',') })));
    const view = await p.evaluate(() => { try { return localStorage.getItem('sf.view'); } catch { return ''; } });
    out.push(`${view || 'default'} ${vw}: ${JSON.stringify(r)}`);
    const el = await p.$('#liveSec [data-open="bc-ind-odi2-2026"]') || await p.$('[data-open="bc-ind-odi2-2026"]');
    if (el) { await el.scrollIntoViewIfNeeded(); await p.evaluate(() => document.querySelectorAll('body *').forEach(x => { const ps = getComputedStyle(x).position; if (ps === 'sticky' || ps === 'fixed') x.style.position = 'static'; })); await p.addStyleTag({ content: '.lscore, .score, .ls, .lsc, .livescore { filter: blur(6px) }' }); await el.screenshot({ path: `probe/rainc/${view || 'card'}-${vw}.png` }); }
  } catch (er) { out.push(`${view} ${vw} err ${String(er.message).slice(0, 80)}`); }
  await ctx.close();
}
await b.close(); writeFileSync('probe/out-rainc.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/rainc probe/out-rainc.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
