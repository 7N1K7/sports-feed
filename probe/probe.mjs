// probe 141: the live feed saved for local tests (it's public anyway), and the live site's Standard view on a phone
import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const t = await (await fetch('https://kickoff.kiwi/data/feed.json?t=' + Date.now())).text();
await writeFile('probe/out-feed.json', t);
console.log('feed saved', t.length);
const b = await chromium.launch();
for (const w of [360, 412]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1300 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { localStorage.setItem('sf.nocount', 'true'); localStorage.setItem('sf.view', '"mixed"'); });
  const p = await ctx.newPage(); await p.goto('https://kickoff.kiwi/'); await p.waitForTimeout(4000);
  console.log(w, await p.evaluate(() => [...document.querySelectorAll('.ev')].filter(e => e.offsetParent).slice(0, 6).map(c => Math.round(c.getBoundingClientRect().height)).join(' ')));
  await p.screenshot({ path: `probe/out-live-${w}.png` }); await ctx.close();
}
await b.close();
