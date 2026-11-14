// 14 Nov (8): the live site in WebKit (the engine iPhones use), as an iPhone and as a Mac: does the page run without
// errors and draw its games? Not counted as a visit (sf.nocount). Was: the stats server's live log
import { execSync } from 'node:child_process';
try { console.log(execSync('npx playwright install --with-deps webkit 2>&1', { encoding: 'utf8', timeout: 600000 }).split('\n').slice(-4).join('\n')); } catch (e) { console.log('install failed:', String(e.stdout || e.message).slice(-800)); }
const { webkit, devices } = await import('playwright');
let b;
try { b = await webkit.launch(); } catch (e) { console.log('WEBKIT launch failed:', e.message.slice(0, 600)); process.exit(0); }
console.log('WEBKIT', b.version());
for (const [label, opts] of [['iPhone 13', devices['iPhone 13']], ['iPhone SE', devices['iPhone SE']], ['Desktop Safari', devices['Desktop Safari']]]) {
  const ctx = await b.newContext(opts), p = await ctx.newPage(), errs = [];
  await p.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); } catch {} });
  p.on('pageerror', e => errs.push('page error: ' + e.message.slice(0, 300)));
  p.on('console', m => { if (m.type() === 'error') errs.push('console error: ' + m.text().slice(0, 200)); });
  try {
    await p.goto('https://kickoff.kiwi/', { waitUntil: 'load', timeout: 60000 });
    await p.waitForTimeout(6000);
    const st = await p.evaluate(() => ({ cards: document.querySelectorAll('.ev').length, chips: document.querySelectorAll('#sportFilter .chip').length, title: document.title.slice(0, 40), ver: (document.body.innerText.match(/\bv\d{3}\b/) || [''])[0] }));
    console.log(label, JSON.stringify(st));
    await p.screenshot({ path: `probe/out-wk-${label.replace(/\s+/g, '-').toLowerCase()}.png` });
  } catch (e) { console.log(label, 'failed:', e.message.slice(0, 300)); }
  for (const x of errs.slice(0, 8)) console.log('  ', x);
  await ctx.close();
}
await b.close();
