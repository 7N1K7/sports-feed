import { writeFileSync } from 'fs';
import { chromium } from 'playwright';
// Saturday 9am check: feed age, allowed-source times for today's big NZ games, a live browser pass (no scores printed)
const out = [];
const UA = { headers: { 'User-Agent': 'kickoff-kiwi-probe/1.0' } };
try {
  const r = await fetch('https://kickoff.kiwi/data/feed.json?v=' + Date.now()); const t = await r.text(); writeFileSync('probe/out-feed.json', t);
  const f = JSON.parse(t); out.push(`feed generatedAt ${f.generatedAt} age ${Math.round((Date.now() - Date.parse(f.generatedAt)) / 60000)} min, events ${f.events.length}, checks ${JSON.stringify(f.checks || {}).slice(0, 300)}`);
} catch (e) { out.push('feed error ' + e.message); }
const wt = async page => { const j = await (await fetch(`https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&formatversion=2&redirects=1`, UA)).json().catch(() => ({})); return j.parse?.wikitext || ''; };
const search = async q => { const j = await (await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&srlimit=4`, UA)).json().catch(() => ({})); return (j.query?.search || []).map(x => x.title); };
const boxes = t => [...t.matchAll(/\{\{\s*(Rugbybox|rugbybox|Rugby box|Football box[^|\n]*|Single-innings cricket match|Limited overs international|Rugby league box|RLbox|Basketballbox|Basketball box|Netballbox)([\s\S]*?)\n\}\}/g)].map(m => m[2]);
const fld = (b, k) => ((b.match(new RegExp(`\\|\\s*${k}\\s*=\\s*([^\\n]*)`)) || [])[1] || '').replace(/\{\{flag(icon|country)?\|?|\[\[[^|\]]*\||\[\[|\]\]|\}\}|<[^>]*>/gi, '').trim().slice(0, 60);
const show = (label, t, re) => { const bs = boxes(t).filter(b => re.test(b)); out.push(`${label}: page ${t ? 'ok' : 'missing'}, ${bs.length} boxes`); for (const b of bs.slice(0, 6)) out.push(`   ${fld(b, 'date')} | ${fld(b, 'time')} | ${fld(b, 'home') || fld(b, 'team1')} v ${fld(b, 'away') || fld(b, 'team2')} | ${fld(b, 'stadium') || fld(b, 'venue')}`); };
try {
  show('Nations NH', await wt('2026 Nations Championship Northern Hemisphere Series'), /Argentina[\s\S]*Ireland|Ireland[\s\S]*Argentina|New Zealand/);
  const ind = await search('India cricket tour of New Zealand 2026 ODI'); out.push('india search: ' + ind.join(' / '));
  if (ind[0]) show('India tour ' + ind[0], await wt(ind[0]), /November 2026/);
  show('RLWC', await wt('2026 Rugby League World Cup'), /Tonga/);
  show('WRLWC', await wt("2026 Women's Rugby League World Cup"), /Samoa/);
  show('Auckland FC', await wt('2026–27 Auckland FC season'), /Wellington/);
  const br = await wt('2026–27 New Zealand Breakers season'); show('Breakers', br, /(\b[3-9]|1[0-2]) November 2026|November [3-9]|November 1[0-2]/);
} catch (e) { out.push('wiki error ' + e.message); }
// live browser pass
const b = await chromium.launch({ channel: 'chrome' });
for (const vw of [1280, 412]) {
  const ctx = await b.newContext({ viewport: { width: vw, height: 900 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); localStorage.removeItem('sf.sport'); localStorage.removeItem('sf.comp'); localStorage.removeItem('sf.showHere'); } catch (e) {} });
  try {
    await p.goto('https://kickoff.kiwi/?v=' + Date.now(), { waitUntil: 'networkidle', timeout: 45000 }); await p.waitForTimeout(1500);
    const st = await p.evaluate(() => {
      const nowNZ = new Date().toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' });
      const rows = sel => [...document.querySelectorAll(sel + ' article.ev')].map(a => { const sp = [...a.classList].find(c => c.startsWith('sport-'))?.slice(6); const when = a.querySelector('.when')?.innerText.replace(/\s+/g, ' ').slice(0, 50) || ''; const w = a.querySelector('.watch')?.innerText.replace(/\s+/g, ' ').replace(/^Watch\s*/, '').slice(0, 50) || '-';
        return { sp, t: a.getAttribute('aria-label').replace(/, details$/, '').slice(0, 50), when, w, live: a.classList.contains('is-live'), score: !!a.querySelector('.lscore:not([data-reveal])') && /\d/.test(a.querySelector('.lscore')?.innerText || '') }; });
      const sec = id => { const s = document.getElementById(id); return s ? (s.hidden ? 'hidden' : 'shown') : 'none'; };
      let guard = 'n/a';
      try { const recent = new Set((FEED.events || []).filter(e => e.score && Date.now() - Date.parse(e.startUTC) < 2.5 * 864e5).map(e => e.id)); let shown = 0, cov = 0;
        document.querySelectorAll('article.ev[data-open]').forEach(a => { if (!recent.has(a.dataset.open)) return; const txt = a.innerText; const e = FEED.events.find(x => x.id === a.dataset.open); const sc = String(e.score || '').split(/[^0-9]+/).filter(x => x.length).slice(0, 2); if (sc.length === 2 && txt.includes(e.score)) shown++; else cov++; });
        guard = `recent results on page: covered ${cov}, shown ${shown}`; } catch (e) { guard = 'err ' + e.message; }
      return { nowNZ, soon: sec('soonSec'), live: sec('liveSec'), soonRows: rows('#soon'), liveRows: rows('#live'), today: rows('#today'), chips: [...document.querySelectorAll('#nowChips [data-bigcomp]')].map(x => x.dataset.bigcomp), wk: [...document.querySelectorAll('#weekComps button')].length, guard };
    });
    out.push(`\n${vw}: NZ ${st.nowNZ} | Starting soon ${st.soon} (${st.soonRows.length}) | Live now ${st.live} (${st.liveRows.length}) | On today ${st.today.length} | series chips ${st.chips.length} | week buttons ${st.wk} | ${st.guard}`);
    for (const [n, l] of [['soon', st.soonRows], ['live', st.liveRows], ['today', st.today]]) for (const r of l) out.push(`   ${n} ${r.sp} | ${r.t} | ${r.when} | ${r.w}${r.live ? ' | LIVE' : ''}${r.score ? ' | SCORE VISIBLE' : ''}`);
    out.push('   chips: ' + st.chips.join(' / '));
    if (vw === 412) { await p.evaluate(() => scrollTo(0, 0)); await p.screenshot({ path: 'probe/out-sat-412.png' }); }
    // Ireland v Argentina's details
    const ia = await p.$('article.ev[aria-label*="Ireland"][aria-label*="Argentina"]');
    if (ia) { await ia.click(); await p.waitForTimeout(800); out.push('   IRE v ARG sheet: ' + (await p.evaluate(() => document.querySelector('#sheet')?.open ? [...document.querySelectorAll('#sheet .watchlist li')].map(l => l.innerText.replace(/\s+/g, ' ')).join(' ; ') + ' | ' + (document.querySelector('#sheet')?.innerText.match(/\d{1,2}:\d\d ?[ap]m[^\n]{0,30}/i)?.[0] || '') : 'not open'))); await p.keyboard.press('Escape'); await p.waitForTimeout(400); }
    else out.push('   IRE v ARG: no row on the page');
    // a few competition pages from the series row
    for (const want of [/Nations/i, /World Cup/i, /India/i, /Sandown|Supercars/i]) {
      const c = st.chips.find(x => want.test(x)); if (!c) { out.push(`   comp ${want}: no chip`); continue; }
      const y0 = await p.evaluate(() => document.getElementById('weekSec').getBoundingClientRect().top);
      await p.click(`#nowChips [data-bigcomp="${c.replace(/"/g, '\\"')}"]`); await p.waitForTimeout(900);
      const r = await p.evaluate(() => ({ sel: document.getElementById('compSel').innerText, n: document.querySelectorAll('main article.ev:not([hidden]), #week .dot').length, today: document.querySelectorAll('#today article.ev').length, week: document.querySelectorAll('#week article.ev').length }));
      out.push(`   comp ${c}: menu "${r.sel}" today ${r.today} week rows ${r.week}`);
      await p.click(`#nowChips [data-bigcomp="${c.replace(/"/g, '\\"')}"]`).catch(() => {}); await p.waitForTimeout(700);
      const r2 = await p.evaluate(() => document.getElementById('compSel').innerText); out.push(`      closed: menu "${r2}"`);
    }
    if (errs.length) out.push('   ERR ' + errs.join('; ')); else out.push('   no page errors');
  } catch (e) { out.push(`${vw}: error ${e.message.split('\n')[0]}`); }
  await ctx.close();
  // basketball: the faded NBA button and its eye
  const c2 = await b.newContext({ viewport: { width: vw, height: 900 }, serviceWorkers: 'block' }); const p2 = await c2.newPage(); const e2 = []; p2.on('pageerror', e => e2.push(e.message));
  await p2.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); localStorage.setItem('sf.sport', '["basketball"]'); localStorage.setItem('sf.comp', '""'); localStorage.removeItem('sf.showHere'); } catch (e) {} });
  try {
    await p2.goto('https://kickoff.kiwi/?v=' + Date.now(), { waitUntil: 'networkidle', timeout: 45000 }); await p2.waitForSelector('#weekComps .qeye', { timeout: 15000 }); await p2.waitForTimeout(1000);
    const st = () => p2.evaluate(() => { const box = document.getElementById('weekComps'), r = box.getBoundingClientRect(); return { x: Math.round(r.left), w: Math.round(r.width), eye: box.querySelector('.qeye')?.getAttribute('aria-pressed'), faded: box.querySelector('[data-off]')?.classList.contains('is-off'), dots: document.querySelectorAll('#week .dot').length, today: document.querySelectorAll('#today article.ev').length }; });
    const s0 = await st(); await p2.click('#weekComps .qeye'); await p2.waitForTimeout(1000); const s1 = await st(); await p2.click('#weekComps .qeye'); await p2.waitForTimeout(1000); const s2 = await st();
    await p2.click('#weekComps [data-off]'); await p2.waitForTimeout(1000); const s3 = await p2.evaluate(() => ({ sel: document.getElementById('compSel').innerText, today: document.querySelectorAll('#today article.ev').length, week: document.querySelectorAll('#week article.ev').length }));
    out.push(`   basketball ${vw}: faded ${s0.faded} eye ${s0.eye} dots ${s0.dots} today ${s0.today} -> eye ${s1.eye} dots ${s1.dots} today ${s1.today} same ${s1.x === s0.x && s1.w === s0.w} -> back eye ${s2.eye} dots ${s2.dots} same ${s2.x === s0.x && s2.w === s0.w} | NBA tap: "${s3.sel}" today ${s3.today} week ${s3.week}${e2.length ? ' ERR ' + e2.join('; ') : ''}`);
  } catch (e) { out.push(`   basketball ${vw}: error ${e.message.split('\n')[0]}`); }
  await c2.close();
}
await b.close();
writeFileSync('probe/out.txt', 'sat9am\n' + out.join('\n') + '\n');
