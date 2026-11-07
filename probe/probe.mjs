import { writeFileSync } from 'fs';
import { chromium } from 'playwright';
// live605: tonight's NBL times, the 2nd ODI's state of play (no scores), tonight's channels, and the i, its pop-up,
// the switch fill and the NBA default in a browser (sf.nocount set, so these aren't counted as visits)
const out = ['live605'];
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
out.push('feed ' + f.generatedAt + ' v' + f.site?.version);
const d = f.diag || {};
out.push('tsdb NBL: ' + JSON.stringify(d['tsdb NBL']) + ' | tsdbFilled: ' + String(d.tsdbFilled || '').slice(0, 400));
const ev = f.events || [];
for (const e of ev.filter(e => e.comp === 'NBL' && e.startUTC >= '2026-11-06T12' && e.startUTC < '2026-11-16').sort((a, b) => a.startUTC.localeCompare(b.startUTC)))
  out.push(`  NBL ${e.startUTC} | ${new Date(e.startUTC).toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland', weekday: 'short', hour: 'numeric', minute: '2-digit' })} NZ | ${e.home} v ${e.away} | ${e.status} | tv ${JSON.stringify((e.tv || []).map(t => t.ch))}`);
const odi = ev.find(e => e.id === 'bc-ind-odi2-2026') || ev.find(e => /2nd ODI v India/.test(e.comp || ''));
if (odi) out.push(`ODI ${odi.startUTC} status=${odi.status} progress=${JSON.stringify(odi.progress ?? null)} rainInProgress=${/\b(rain|wet|bad light|delayed|no play)\b/i.test(odi.progress || '')} wxNews=${odi.wxNews ? (odi.wxNews.credit || 'yes') : 'none'} keys=${Object.keys(odi).join(',')}`);
out.push('rainHeadlines: ' + String(d.rainHeadlines || '').replace(/;.*$/, '') + ' | on our matches: ' + (/none on our matches/.test(d.rainHeadlines || '') ? 'none' : 'some'));
for (const [n, re] of [['Kiwis v Tonga', /Tonga/], ['Auckland FC v Phoenix', /Auckland FC|Phoenix/]])
  for (const e of ev.filter(e => re.test(`${e.home} ${e.away}`) && e.startUTC >= '2026-11-07' && e.startUTC < '2026-11-08T12'))
    out.push(`${n}: ${e.startUTC} ${e.home} v ${e.away} | broadcast=${e.broadcast} | watchAlt=${e.watchAlt || ''} | tv=${JSON.stringify(e.tv || [])}`);
const al = ev.find(e => e.comp === 'A-League Men' && e.status === 'upcoming' && !/Auckland|Wellington/.test(e.home + e.away));
if (al) out.push('A-League non-NZ: ' + al.broadcast);
const nbl = ev.find(e => e.comp === 'NBL' && e.status === 'upcoming'); if (nbl) out.push('NBL watch: ' + nbl.broadcast);
const nc = ev.filter(e => /Nations Championship/.test(e.comp || '')); out.push('Nations Championship events ' + nc.length + ', July ' + nc.filter(e => /^2026-07/.test(e.startUTC)).length);
// the browser
const b = await chromium.launch({ channel: 'chrome' });
for (const vw of [1280, 412]) {
  const ctx = await b.newContext({ viewport: { width: vw, height: 900 }, deviceScaleFactor: vw === 1280 ? 1 : 2 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); } catch (e) {} });
  await p.goto('https://kickoff.kiwi/?x=' + Date.now(), { waitUntil: 'load' }); await p.waitForSelector('#sportFilter .sportchip'); await p.waitForTimeout(1500);
  const i = p.locator('.sinfo').filter({ visible: true }).first();
  const ir = await i.evaluate(x => { const cs = getComputedStyle(x), r = x.getBoundingClientRect(); return { border: cs.borderTopWidth, shadow: cs.boxShadow.slice(0, 60), x: r.x, y: r.y, w: r.width }; });
  await p.screenshot({ path: `probe/out-i-${vw}.png`, clip: { x: Math.max(0, ir.x - 10), y: Math.max(0, ir.y - 10), width: ir.w + 20, height: ir.w + 20 } });
  await i.click(); await p.waitForTimeout(400);
  const pop = await p.evaluate(() => { const pp = document.getElementById('sinfoPop'), r = pp.getBoundingClientRect(); return { shown: !pp.hidden, w: r.width, def: document.getElementById('sinfoDef').textContent, defTag: !!document.querySelector('#sinfoDef .hidgo'), defH: Math.round(document.getElementById('sinfoDef').getBoundingClientRect().height), off: document.getElementById('sinfoOff')?.textContent ?? 'missing', r: [r.x, r.y, r.width, r.height] }; });
  await p.screenshot({ path: `probe/out-pop-${vw}.png`, clip: { x: Math.max(0, pop.r[0] - 4), y: Math.max(0, pop.r[1] - 4), width: pop.r[2] + 8, height: pop.r[3] + 8 } });
  await p.locator('#sinfoDef .hidgo').first().click(); await p.waitForTimeout(900);
  const tap = await p.evaluate(() => ({ popHidden: document.getElementById('sinfoPop').hidden, panel: !document.getElementById('panel').hidden, flash: document.querySelector('#teamGroups .group.flash')?.dataset.g }));
  await p.keyboard.press('Escape'); await p.goto('https://kickoff.kiwi/?x=' + Date.now(), { waitUntil: 'load' }); await p.waitForSelector('#sportFilter .sportchip'); await p.waitForTimeout(1200);
  // the NBA by default: its games show with Basketball picked
  await p.locator('#sportFilter .sportchip', { hasText: /Basketball/ }).first().click(); await p.waitForTimeout(800);
  const nba = await p.evaluate(() => ({ rows: [...document.querySelectorAll('.ev')].filter(x => /NBA/.test(x.textContent)).length, faded: !!document.querySelector('[data-comp="NBA"].off, .compchip.off') }));
  const ver = await p.evaluate(() => (document.body.innerText.match(/\bv(\d{3,4})\b/) || [])[1]);
  out.push(`browser ${vw}: version v${ver} | i ${JSON.stringify(ir)} | pop ${JSON.stringify(pop)} | NBA tag tap ${JSON.stringify(tap)} | NBA on Basketball ${JSON.stringify(nba)} | errors ${errs.join('; ') || 'none'}`);
  await ctx.close();
}
await b.close();
writeFileSync('probe/out.txt', out.join('\n') + '\n');
console.log(out.join('\n'));
