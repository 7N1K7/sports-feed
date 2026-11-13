// 13 Nov: the live site after the review's fixes (v723): does the page draw with no errors, and is the feed sound? No scores printed
import { chromium } from 'playwright';
let f;
for (let i = 0; i < 30; i++) { f = await (await fetch('https://kickoff.kiwi/data/feed.json?probe=' + Date.now())).json(); if ((f.site?.version || 0) >= 723) break; await new Promise(r => setTimeout(r, 45000)); }
const ev = f.events, ids = {}; for (const e of ev) ids[e.id] = (ids[e.id] || 0) + 1;
console.log('feed version', f.site?.version, 'built', f.generatedAt, 'events', ev.length, 'news', f.news.length, 'duplicate ids', Object.values(ids).filter(n => n > 1).length);
for (const k of ['duplicateIds', 'wikiFailed', 'newsFailed', 'movedGames', 'pairTrial']) console.log(' diag.' + k + ':', JSON.stringify(f.diag[k] ?? 'not set').slice(0, 200));
console.log(' diag.wikipedia is', typeof f.diag.wikipedia, '| youtube:', String(f.diag.youtube || '').slice(0, 120));
const fe = Object.values(f.form || {}).flat(); console.log(' form entries', fe.length, 'with a start time', fe.filter(x => x.t).length);
console.log(' series kept:', ['concup-2026-g1', 'concup-2026-g2', 'bc-ind-t20i1-2026'].map(i => i + (ids[i] ? ' yes' : ' NO')).join(', '));
const n = s => String(s).toLowerCase().replace(/women|[^a-z]/g, ''), same = (p, q) => n(p) && n(p) === n(q), w = e => /women|wheelchair/i.test([e.comp, e.home, e.away].join(' ')), src = e => /^(wiki-|tsdb-)/.test(e.id);
const dbl = []; for (let a = 0; a < ev.length; a++) for (let b = a + 1; b < ev.length; b++) { const x = ev[a], y = ev[b]; if (!x.home || !y.home || x.sport !== y.sport || w(x) !== w(y) || (x.session || '') !== (y.session || '') || (!src(x) && !src(y)) || Math.abs(Date.parse(x.startUTC) - Date.parse(y.startUTC)) > 3 * 864e5) continue;
  if ((same(x.home, y.home) && same(x.away, y.away)) || (same(x.home, y.away) && same(x.away, y.home))) dbl.push(`${x.id} ${x.home} v ${x.away} ${x.startUTC.slice(2, 16)}${x.timeTBC ? '?' : ''} [${x.comp} ${x.stage || ''}] <> ${y.id} ${y.startUTC.slice(2, 16)}${y.timeTBC ? '?' : ''} [${y.comp} ${y.stage || ''}]`); }
console.log(' source cards with the same two sides as another card within 3 days:', dbl.length); console.log(dbl.slice(0, 30).join('\n'));
const b = await chromium.launch({ channel: 'chrome' });
for (const [wd, h, view] of [[412, 860, 'mixed'], [412, 860, 'list'], [1280, 900, 'mixed']]) {
  const p = await b.newPage({ viewport: { width: wd, height: h } }), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(v => { localStorage.setItem('sf.nocount', 'true'); localStorage.setItem('sf.view', JSON.stringify(v)); }, view);
  await p.goto('https://kickoff.kiwi/?probe=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  const cards = await p.$$eval('.ev', x => x.length), ver = await p.evaluate(() => (document.body.innerText.match(/\bv\d{3,}\b/) || [''])[0]);
  const first = await p.$('[data-open]'); await first.click(); await p.waitForTimeout(400); const open = await p.$eval('#sheet', s => s.open); await p.keyboard.press('Escape');
  await p.click('#teamsBtn'); await p.waitForTimeout(400); const groups = await p.$$eval('#teamGroups .group', x => x.length); await p.keyboard.press('Escape');
  const wide = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  console.log('page', wd, view, '| version shown', ver, '| cards', cards, '| pop-up opens', open, '| settings groups', groups, '| sideways scroll', wide, '| page errors', errs.join('; ') || 'none');
  await p.close();
}
await b.close();
