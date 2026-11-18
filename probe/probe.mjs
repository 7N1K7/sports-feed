// v797: the live page keeps the last feed and draws from it on a repeat visit. Counts and times only, no results.
import { writeFileSync } from 'node:fs';
const out = []; process.on('exit', () => writeFileSync('probe/out.txt', out.join('\n') + '\n'));
const { chromium } = await import('playwright');
const b = await chromium.launch({ channel: 'chrome' });
try {
  const ctx = await b.newContext({ viewport: { width: 412, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); } catch {} });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.message).slice(0, 120)));
  const look = async label => {
    const ok = await p.waitForSelector('[data-open]', { timeout: 30000 }).then(() => true, () => false);
    const s = await p.evaluate(async () => {
      let kept = 'none'; try { const r = await caches.match(location.origin + '/data/feed.json'); if (r) { const f = await r.json(); kept = `${f.events.length} games, built ${f.generatedAt}, site ${f.site?.version}`; } } catch (e) { kept = 'error ' + e.message; }
      return { t: Math.round(performance.now()), fresh: document.getElementById('fresh').textContent, bar: !document.getElementById('mockBar').hidden, cards: document.querySelectorAll('[data-open]').length, sw: !!navigator.serviceWorker.controller, has: /savedFeed/.test(document.documentElement.innerHTML), kept };
    });
    out.push(`${label}: games on screen ${ok}, by ${s.t}ms, cards ${s.cards}, "${s.fresh}", grey bar showing ${s.bar}, service worker in charge ${s.sw}, new code ${s.has}, copy kept: ${s.kept}`);
  };
  await p.goto('https://kickoff.kiwi/', { waitUntil: 'domcontentloaded' }); await look('first visit'); await p.waitForTimeout(3000); await look('first visit +3s');
  await p.reload({ waitUntil: 'domcontentloaded' }); await look('repeat visit');
  await p.waitForTimeout(4000); await look('repeat visit +4s');
  await ctx.setOffline(true);
  await p.reload({ waitUntil: 'domcontentloaded' }).catch(e => out.push('offline reload: ' + String(e.message).slice(0, 100))); await look('offline visit');
  await p.waitForTimeout(3000); await look('offline visit +3s');
  out.push('page errors: ' + errs.length + ' ' + errs.slice(0, 3).join(' | '));
} catch (e) { out.push('probe error: ' + String(e.message).slice(0, 300)); }
await b.close();
