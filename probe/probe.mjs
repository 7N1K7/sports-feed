// 14 Nov: is the live stats page healthy (no password used, nothing counted, no stats read)
import { chromium } from 'playwright';
const html = await fetch(`https://kickoff.kiwi/stats.html?t=${Date.now()}`).then(r => r.text());
const api = (html.match(/STATS_API\s*=\s*['"]([^'"]+)/) || [])[1];
console.log('STATSOK size', html.length, '| first row layout in file:', html.includes('class="ovw"'), '| glance:', html.includes('id="glance"'), '| wanted:', html.includes('id="wantCard"'));
const v = await fetch(`https://kickoff.kiwi/data/version.json?t=${Date.now()}`).then(r => r.json()).catch(() => ({})); console.log('site version', v.version);
if (api) { const r = await fetch(api + '/stats'); console.log('server /stats with no password:', r.status, (await r.text()).slice(0, 80)); }
const b = await chromium.launch({ channel: 'chrome' }); const errs = [];
for (const w of [1467, 412]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } }); p.on('pageerror', e => errs.push(`${w}: ${e.message}`)); p.on('console', m => m.type() === 'error' && errs.push(`${w} console: ${m.text().slice(0, 120)}`));
  await p.addInitScript(() => localStorage.setItem('sf.nocount', 'true'));
  await p.goto('https://kickoff.kiwi/stats.html'); await p.waitForTimeout(2500);
  console.log(w, 'password box shown:', await p.isVisible('input[type=password]').catch(() => false), '| sideways scroll:', await p.evaluate(() => document.documentElement.scrollWidth > innerWidth));
  await p.close();
}
console.log('page errors:', JSON.stringify(errs)); await b.close();
