// 8 Nov (2): v634's changes on kickoff.kiwi with no series open: UFC 334's tag, NZ A's stream link, the Nations Cup's
// side names (labels only; no results)
import { execSync } from 'child_process'; import { writeFileSync } from 'fs';
import { chromium } from 'playwright';
const out = ['live2 ' + new Date().toISOString()];
const html = await (await fetch('https://kickoff.kiwi/?x=' + Date.now())).text();
out.push(`page has v633 code: ${html.includes('function ytNow')}, v634 code: ${html.includes("'TVNZ+ Event Pass': ['Pay-per-view'")}, v632 code: ${html.includes('function hubReveal')}`);
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 412, height: 900 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { localStorage.setItem('sf.nocount', 'true'); localStorage.removeItem('sf.comp'); });
await p.goto('https://kickoff.kiwi/', { waitUntil: 'load' }); await p.waitForTimeout(3000);
out.push('version shown: ' + (await p.evaluate(() => (document.body.innerText.match(/\bv6\d\d\b/) || [''])[0])));
const nz = await p.evaluate(() => { const x = [...document.querySelectorAll('main .ev')].find(x => /3rd four-day/.test(x.textContent)); return x ? [...x.querySelectorAll('a')].filter(a => /youtube/.test(a.href)).map(a => a.href.includes('/streams') ? 'channel streams page' : 'video …' + a.href.slice(-4)) : 'not in list'; });
out.push('NZ A 3rd match YouTube links: ' + JSON.stringify(nz));
await p.tap('#sportFilter [data-sport="mma"]'); await p.waitForTimeout(1200);
const u = await p.evaluate(() => { const x = [...document.querySelectorAll('main .ev')].find(x => /UFC 334/.test(x.textContent)); return x ? x.innerText.split('\n').filter(t => /FREE|pay-per-view|Event Pass/i.test(t)) : 'not in list'; });
out.push('UFC 334 card: ' + JSON.stringify(u));
await p.tap('#sportFilter [data-sport="mma"]'); await p.waitForTimeout(600);
await p.tap('#sportFilter [data-sport="rugby"]'); await p.waitForTimeout(1200);
const nc = await p.$('[data-bigcomp="World Rugby Nations Cup"]');
if (nc) { await nc.tap(); await p.waitForTimeout(1500);
  const sides = await p.evaluate(() => [...document.querySelectorAll('main .ev')].filter(x => x.offsetParent).slice(0, 8).map(x => (x.innerText.split('\n').find(t => / v |\bv\b/.test(t)) || x.innerText.split('\n').slice(2, 5).join(' / ')).slice(0, 60)));
  out.push('Nations Cup cards: ' + JSON.stringify(sides));
  out.push('nicknames shown: ' + await p.evaluate(() => /Lelos|Los Teros|Ikale Tahi|Manu Samoa|\bOaks\b|Leones|Lobos|Cóndores|Sables/.test(document.querySelector('main').innerText)));
} else out.push('no Nations Cup button');
out.push('errors: ' + errs.join(';'));
await b.close();
writeFileSync('probe/out-live2.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/out-live2.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
