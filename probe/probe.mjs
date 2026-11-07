// rn: the 2nd ODI in Wellington during a rain hold-up: what the live site shows. Labels and yes/no only, never scores
import { chromium } from 'playwright'; import { execSync } from 'child_process'; import { writeFileSync } from 'fs';
const out = ['rn ' + new Date().toISOString()], ID = 'bc-ind-odi2-2026', now = Date.now();
const RAIN = /\b(rain|wet|drizzle|bad light|covers|delay|weather)/i, mins = t => t ? Math.round((now - Date.parse(t)) / 6e4) + ' min ago' : 'none';
try {
  const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + now)).json(); const e = (f.events || []).find(x => x.id === ID);
  out.push(`feed built ${mins(f.generatedAt)}`);
  if (!e) out.push('event not in feed'); else out.push(`event: status=${e.status || '-'} liveState=${e.liveState || '-'} liveAt=${mins(e.liveAt)} progress=${e.progress ? 'yes' : 'no'} progressSaysRain=${RAIN.test(e.progress || '') ? 'yes' : 'no'} weather=${e.weather ? 'yes' : 'no'} weatherSaysRain=${/rain|wet|shower/i.test(e.weather || '') ? 'yes' : 'no'} wxNews=${e.wxNews ? 'yes, ' + mins(e.wxNews.at) : 'no'} wxNewsSaysRain=${RAIN.test(e.wxNews?.title || '') ? 'yes' : 'no'} format=${e.format || '-'}`);
} catch (er) { out.push('feed err ' + String(er.message).slice(0, 100)); }
const b = await chromium.launch({ channel: 'chrome' });
try {
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); } catch (e) {} });
  await p.goto('https://kickoff.kiwi/?x=' + now, { waitUntil: 'load' }); await p.waitForTimeout(4500);
  const LBL = /On now|Rain delay|Rain affected|Starting soon|Day \d next|Result|Finished|Full time/gi;
  const card = await p.evaluate(id => { const c = document.querySelector(`[data-open="${id}"]`); if (!c) return null; const sec = c.closest('section, [id$="Sec"]'); return { sec: sec?.id || '?', text: c.innerText }; }, ID);
  out.push(card ? `card in ${card.sec}; labels: ${[...new Set(card.text.match(LBL) || [])].join(', ') || 'none'}` : 'card not shown');
  await p.goto('https://kickoff.kiwi/?x=' + now + '#g=' + ID, { waitUntil: 'load' }); await p.waitForTimeout(4000);
  const pop = await p.evaluate(() => document.querySelector('#sheetBody .sheet-head')?.innerText || '');
  out.push(`pop-up head labels: ${[...new Set(pop.match(LBL) || [])].join(', ') || 'none'}; errors=${errs.join('; ').slice(0, 160) || 'none'}`);
} catch (er) { out.push('err ' + String(er.message).slice(0, 160)); }
await b.close(); writeFileSync('probe/out-rn.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/out-rn.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
