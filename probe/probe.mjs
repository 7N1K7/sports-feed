import fs from 'fs';
import { chromium } from 'playwright';
const L = [];
const p = (...a) => L.push(a.join(' '));
const b = await chromium.launch();
const pg = await (await b.newContext({ viewport: { width: 412, height: 900 }, isMobile: true, hasTouch: true })).newPage();
await pg.addInitScript(() => { localStorage.setItem('sf.nocount', 'true'); localStorage.setItem('sf.sport', JSON.stringify(['motor'])); });
pg.on('pageerror', e => p('ERR', e.message));
await pg.goto('https://kickoff.kiwi/?x=' + Date.now(), { waitUntil: 'networkidle' });
await pg.waitForTimeout(3000);
p('version:', await pg.evaluate(() => document.body.innerText.match(/v\d{3}/)?.[0] || ''));
p('motor cards:', (await pg.evaluate(() => [...document.querySelectorAll('article.ev')].map(a => a.querySelector('.comp, .cmp')?.textContent.trim() || a.textContent.trim().slice(0, 50)).filter(t => /Formula|Supercars/.test(t)))).join(' | '));
const a = await pg.$('[data-open="f1-2026-18"]'); if (a) { await a.click(); await pg.waitForTimeout(800); p('weekend:', await pg.evaluate(() => [...document.querySelectorAll('.wkses li')].map(li => li.textContent).join(' | '))); }
await b.close();
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n'));
