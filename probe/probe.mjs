// 10 Nov: Stuff's website terms, rendered in a browser (the page fills its text in with script): clauses on RSS, robots, reuse
import { chromium } from 'playwright'; import { writeFileSync } from 'fs';
const out = [];
const b = await chromium.launch({ channel: 'chrome' });
try {
  const p = await b.newPage();
  await p.goto('https://www.stuff.co.nz/about-us/350113530/website-terms-and-conditions', { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(3000);
  const t = await p.evaluate(() => document.body.innerText);
  out.push('chars ' + t.length);
  const paras = t.split(/\n+/).map(s => s.trim()).filter(Boolean);
  const KEY = /\b(rss|feeds?|automat\w*|robots?|bots?|scrap\w*|crawl\w*|spider|reproduc\w*|republish|personal|non-commercial|commercial|headlines?|link\w*|frame|copy\w*|data min\w*)\b/i;
  paras.forEach((s, i) => { if (KEY.test(s)) out.push(`[${i}] ${s}`); });
} catch (e) { out.push('err ' + e.message); }
await b.close();
writeFileSync('probe/out-stuffterms.txt', out.join('\n') + '\n');
