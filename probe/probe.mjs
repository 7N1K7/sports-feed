// 8 Nov: v632 to v634 on kickoff.kiwi: series box tab rows on phones, Nations Cup names, UFC 334's tag, NZ A's stream
// link (labels and counts only; no results)
import { execSync } from 'child_process'; import { writeFileSync } from 'fs';
import { chromium } from 'playwright';
const out = ['live ' + new Date().toISOString()];
let v = 0; for (let i = 0; i < 40; i++) { try { v = +(await (await fetch('https://kickoff.kiwi/?x=' + Date.now())).text()).match(/\bv(\d{3,})\b/)?.[1] || 0; } catch {} if (v >= 634) break; await new Promise(r => setTimeout(r, 15000)); }
out.push('site v' + v);
const b = await chromium.launch({ channel: 'chrome' });
for (const [w, h] of [[360, 640], [412, 732], [1280, 800]]) {
  const phone = w < 500, ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: phone, hasTouch: phone });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('sf.nocount', 'true'); });
  await p.goto('https://kickoff.kiwi/', { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const c = await p.$('[data-bigcomp^="Black Caps v India"]') || await p.$('#nowChips [data-bigcomp]');
  const name = await c.getAttribute('data-bigcomp'); if (phone) await c.tap(); else await c.click(); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const hb = document.getElementById('hubBox').getBoundingClientRect(), bt = [...document.querySelectorAll('#hubTabs button')].map(x => x.getBoundingClientRect());
    const first = [...document.querySelectorAll('main .ev')].map(x => x.getBoundingClientRect()).find(r => r.height && r.top >= hb.bottom);
    return `hub ${Math.round(hb.top)}..${Math.round(hb.bottom)}, ${bt.length} tabs in ${new Set(bt.map(x => Math.round(x.top))).size} rows, first game top ${first ? Math.round(first.top) : '-'} of ${innerHeight}, y=${Math.round(scrollY)}`; });
  out.push(`${w}x${h} ${name}: ${r} ${errs.join(';')}`);
  if (w === 412) {
    const nc = await p.evaluate(() => [...document.querySelectorAll('main .ev')].filter(x => /Nations Cup/i.test(x.textContent)).slice(0, 6).map(x => [...x.querySelectorAll('.team, .side, .tn, b')].map(t => t.textContent.trim()).filter(Boolean).slice(0, 2).join(' v ')));
    out.push('Nations Cup sides on cards: ' + JSON.stringify(nc));
    const nick = await p.evaluate(() => /Lelos|Los Teros|Ikale Tahi|Manu Samoa|Oaks|Leones|Lobos|Cóndores|Sables/.test([...document.querySelectorAll('main .ev')].filter(x => /Nations Cup/i.test(x.textContent)).map(x => x.textContent).join(' ')));
    out.push('nicknames on Nations Cup cards: ' + nick);
    const u = await p.evaluate(() => { const x = [...document.querySelectorAll('main .ev')].find(x => /UFC 334/.test(x.textContent)); return x ? [...x.querySelectorAll('span, a, b')].map(t => t.textContent.trim()).filter(t => /FREE|pay-per-view/i.test(t) && t.length < 40) : 'not in list'; });
    out.push('UFC 334 card tags: ' + JSON.stringify(u));
    const nz = await p.evaluate(() => { const x = [...document.querySelectorAll('main .ev')].find(x => /3rd four-day/.test(x.textContent)); return x ? [...x.querySelectorAll('a')].filter(a => /youtube/.test(a.href)).map(a => a.href.replace(/v=.*/, 'v=…' + a.href.slice(-4))) : 'not in list'; });
    out.push('NZ A 3rd match YouTube links: ' + JSON.stringify(nz));
  }
  await ctx.close();
}
await b.close();
writeFileSync('probe/out-live.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/out-live.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
