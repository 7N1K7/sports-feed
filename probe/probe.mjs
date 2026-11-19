// daily check, 20 Nov, after v804: the Plunket Shield rounds on the live feed and page. No results printed.
import { writeFileSync } from 'node:fs';
const out = []; process.on('exit', () => writeFileSync('probe/out.txt', out.join('\n') + '\n'));
try {
  const f = await (await fetch('https://kickoff.kiwi/data/feed.json?t=' + Date.now())).json(); const now = Date.now();
  out.push(`feed built ${f.generatedAt} (${Math.round((now - Date.parse(f.generatedAt)) / 6e4)} min ago) | site ${f.site?.version} | games ${f.events.length} | no sport: ${f.events.filter(e => !e.sport).length} | no status: ${f.events.filter(e => !e.status).length}`);
  const ps = f.events.filter(e => /Plunket/.test(e.comp));
  out.push(`Plunket Shield games ${ps.length}, with sport cricket ${ps.filter(e => e.sport === 'cricket').length}, upcoming ${ps.filter(e => e.status === 'upcoming').length}`);
  out.push('thinWeeks: ' + JSON.stringify(f.checks?.thinWeeks));
  const { chromium } = await import('playwright'); const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext({ viewport: { width: 412, height: 900 } }); await ctx.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); } catch {} });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.message).slice(0, 120)));
  await p.goto('https://kickoff.kiwi/?t=' + Date.now() + '#g=ps-r2-1-2026', { waitUntil: 'domcontentloaded' }); await p.waitForSelector('[data-open]', { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(2500);
  const s = await p.evaluate(() => { const c = document.querySelector('[data-open="ps-r2-1-2026"]'); const d = [...document.querySelectorAll('dialog[open], .sheet.open, #sheet')].map(x => (x.innerText || '').replace(/\s+/g, ' ').slice(0, 260)).filter(Boolean)[0] || '';
    return { card: c ? c.innerText.replace(/\s+/g, ' ').slice(0, 200) : null, cardClass: c ? c.className : null, pop: d }; });
  out.push('card on the page: ' + JSON.stringify(s.card), 'card class: ' + s.cardClass, 'pop-up from its link: ' + JSON.stringify(s.pop), 'page errors: ' + errs.length + ' ' + errs.slice(0, 2).join(' | '));
  await b.close();
} catch (e) { out.push('probe error: ' + String(e.stack || e).slice(0, 400)); }
