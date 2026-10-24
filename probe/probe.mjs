// probe 183: the live F1 session times and the Sessions tab
import fs from 'fs';
import { chromium } from 'playwright';
const L = [];
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
L.push('diag.f1Sessions: ' + JSON.stringify(f.diag?.f1Sessions));
for (const e of (f.events || []).filter(x => x.sess)) {
  L.push(`${e.id} ${e.home} page=${e.sessPage}`);
  for (const s of e.sess) L.push(`  ${s.n} ${s.t} src=${s.src || '-'} rows=${s.rows ? s.rows.length : '-'}${s.top3 ? ' top3' : ''}`);
}
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 412, height: 1000 } });
await p.addInitScript(() => { localStorage.setItem('sf.nocount', 'true'); localStorage.setItem('sf.comp', JSON.stringify('Formula 1')); });
await p.goto('https://kickoff.kiwi/?x=' + Date.now()); await p.waitForTimeout(4000);
L.push('version: ' + await p.evaluate(() => document.body.innerText.match(/\bv\d{3,}\b/)?.[0]));
L.push('tabs: ' + await p.evaluate(() => [...document.querySelectorAll('#hubTabs button')].map(x => x.textContent).join(' | ')));
const has = await p.$('[data-hubtab="sessions"]');
if (has) { await has.click(); await p.waitForTimeout(800); L.push('sessions tab: ' + (await p.evaluate(() => document.getElementById('hubBody').innerText)).replace(/\s+/g, ' ').slice(0, 900)); }
await b.close();
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
