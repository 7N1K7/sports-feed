import { writeFileSync } from 'fs';
import { chromium } from 'playwright';
// Saturday 9am check, part 2: where to watch on today's rows and in their details; league and A-League times on Wikipedia
const out = [];
const UA = { headers: { 'User-Agent': 'kickoff-kiwi-probe/1.0' } };
const wt = async page => { const j = await (await fetch(`https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&formatversion=2&redirects=1`, UA)).json().catch(() => ({})); return j.parse?.wikitext || ''; };
try {
  for (const [pg, re] of [['2026 Rugby League World Cup', /Tonga/], ["2026 Women's Rugby League World Cup", /Samoa/], ['2026–27 Auckland FC season', /Wellington Phoenix/], ['2026–27 A-League Men', /Wellington Phoenix/]]) {
    const t = await wt(pg); const tpl = [...new Set([...t.matchAll(/\{\{\s*([A-Za-z][^|}\n]{2,40})\s*\n?\|/g)].map(m => m[1].trim()))].slice(0, 25);
    out.push(`${pg}: ${t.length} chars; templates ${tpl.join(', ')}`);
    // lines near the team with a date or time in them (no score fields)
    const ls = t.split('\n'); const hits = [];
    ls.forEach((l, i) => { if (re.test(l)) { const w = ls.slice(Math.max(0, i - 6), i + 7).filter(x => /date|time|November 2026|\d{1,2}:\d\d|stadium|venue/i.test(x) && !/score|result/i.test(x)).map(x => x.trim().slice(0, 90)); hits.push(l.trim().slice(0, 90) + ' || ' + w.join(' ; ')); } });
    out.push(...hits.filter(h => /November 2026|7 November|November 7/.test(h)).slice(0, 4).map(h => '   ' + h));
  }
} catch (e) { out.push('wiki error ' + e.message); }
const b = await chromium.launch({ channel: 'chrome' });
for (const vw of [1280, 412]) {
  const ctx = await b.newContext({ viewport: { width: vw, height: 900 }, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); localStorage.removeItem('sf.sport'); localStorage.removeItem('sf.comp'); } catch (e) {} });
  try {
    await p.goto('https://kickoff.kiwi/?v=' + Date.now(), { waitUntil: 'networkidle', timeout: 45000 }); await p.waitForTimeout(1500);
    const rows = await p.evaluate(() => [...document.querySelectorAll('#live article.ev, #soon article.ev, #today article.ev:not(.res):not(.lres)')].map(a => ({ id: a.dataset.open, t: a.getAttribute('aria-label').replace(/, details$/, '').slice(0, 44), live: a.classList.contains('is-live'),
      w: [...new Set([...a.querySelectorAll('[data-watch], .tvt, .tv, .lfree, .ltv, .fta')].map(x => (x.getAttribute('data-watch') || x.getAttribute('title') || x.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean))].join(' / ').slice(0, 80) })));
    out.push(`\n${vw}: ${rows.length} upcoming or live rows`);
    for (const r of rows) out.push(`   ${r.t} | ${r.w || 'NO WATCH SHOWN'}${r.live ? ' | LIVE' : ''}`);
    if (vw === 1280) for (const want of [/Ireland/, /Black Caps v India/, /Kiwis v Tonga/, /Kiwi Ferns/, /Auckland FC/, /New Zealand A/]) {
      const r = rows.find(x => want.test(x.t)); if (!r) { out.push(`   sheet ${want}: no row`); continue; }
      await p.click(`article.ev[data-open="${r.id}"]`); await p.waitForTimeout(800);
      const s = await p.evaluate(() => { const d = document.getElementById('sheet'); if (!d?.open) return 'not open'; const wl = [...d.querySelectorAll('.watchlist:not(.au) li')].map(l => l.innerText.replace(/\s+/g, ' ').trim()).join(' ; '); const tm = (d.innerText.match(/(Kick-off|First ball|Starts|Tip-off)[^\n]{0,60}/i) || [''])[0]; return `${tm} | NZ: ${wl || 'none'}`; });
      out.push(`   sheet ${r.t}: ${s}`); await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    }
    // the Nations Championship page: the live game should still show
    const c = await p.$('#nowChips [data-bigcomp="Nations Championship"]');
    if (c) { await c.click(); await p.waitForTimeout(900); out.push('   Nations page: ' + await p.evaluate(() => `live ${document.querySelectorAll('#live article.ev').length}, today ${document.querySelectorAll('#today article.ev').length}, week ${document.querySelectorAll('#weekSec article.ev, #weekSec .dot').length}, all ${document.querySelectorAll('main article.ev').length}`)); await c.click(); await p.waitForTimeout(600); }
    out.push(errs.length ? '   ERR ' + errs.join('; ') : '   no page errors');
  } catch (e) { out.push(`${vw}: error ${e.message.split('\n')[0]}`); }
  await ctx.close();
}
await b.close();
writeFileSync('probe/out.txt', 'sat9am2\n' + out.join('\n') + '\n');
