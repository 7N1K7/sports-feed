// 9 Nov: v636 live? series row names and the sport button lines on a computer (labels and positions only)
import { execSync } from 'child_process'; import { writeFileSync } from 'fs'; import { chromium } from 'playwright';
const out = ['v636 ' + new Date().toISOString()];
const b = await chromium.launch({ channel: 'chrome' });
for (let k = 0; k < 20; k++) { const v = (await (await fetch('https://kickoff.kiwi/?x=' + Date.now())).text()); if (v.includes('function evenRows')) { out.push('evenRows live after ' + k + ' tries'); break; } await new Promise(r => setTimeout(r, 30000)); }
for (const W of [1280, 900]) {
  const p = await b.newPage({ viewport: { width: W, height: 900 } });
  await p.addInitScript(() => localStorage.setItem('sf.nocount', 'true'));
  await p.goto('https://kickoff.kiwi/?x=' + Date.now(), { waitUntil: 'load' }); await p.waitForTimeout(3000);
  out.push(W + ' series: ' + await p.evaluate(() => [...document.querySelectorAll('#nowChips [data-bigcomp]')].map(x => x.dataset.bigcomp).join(' | ')));
  out.push(W + ' rows: ' + await p.evaluate(() => { const rows = new Map(); for (const x of document.querySelectorAll('#sportFilter > button')) { const q = x.getBoundingClientRect(); if (!q.width) continue; const t = Math.round(q.top); const o = rows.get(t) || { n: 0, l: 1e9, r: 0 }; o.n++; o.l = Math.min(o.l, q.left); o.r = Math.max(o.r, q.right); rows.set(t, o); } return [...rows.values()].map(o => `${o.n}[${Math.round(o.l)}-${Math.round(o.r)}]`).join(' '); }));
  out.push(W + ' cycling chip: ' + await p.evaluate(() => !!document.querySelector('#sportFilter [data-sport="cycling"]')));
  await p.close(); }
await b.close();
writeFileSync('probe/out-v636.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/out-v636.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
