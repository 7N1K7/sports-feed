// nc7: v629 check: the Nations Cup in the live feed (counts, broadcast, free YouTube streams as yes/no and state) and on the page. No scores
import { chromium } from 'playwright'; import { execSync } from 'child_process'; import { writeFileSync } from 'fs';
const out = ['nc7 ' + new Date().toISOString()], now = Date.now();
try { const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + now)).json();
  const ev = (f.events || []).filter(e => e.team === 'nationscup');
  out.push(`feed built ${f.generatedAt}; site v${f.site?.version}; Nations Cup games ${ev.length}; tables ${(f.tables || []).filter(t => t.comp === 'World Rugby Nations Cup').map(t => t.title).join(' | ')}`);
  for (const e of ev.filter(e => Math.abs(Date.parse(e.startUTC) - now) < 3 * 864e5)) out.push(`  ${e.id.slice(-24)} ${e.startUTC} status=${e.status} bc=${e.broadcast || '-'} note=${e.watchNote ? 'yes' : 'no'} tv=${(e.tv || []).map(x => x.ch + (x.delayed ? ' (delayed)' : '')).join(',') || '-'} yt=${(e.yt || []).map(x => `${x.ch}:${x.state}`).join(',') || '-'}`);
  const d = JSON.stringify(f.diag || {}); const m = d.match(/[^"]{0,80}World Rugby[^"]{0,160}/g) || []; out.push('diag mentions of World Rugby: ' + m.slice(0, 4).map(x => x.replace(/\d+\s*[-–]\s*\d+/g, '#')).join(' || '));
} catch (er) { out.push('feed err ' + String(er.message).slice(0, 100)); }
const b = await chromium.launch({ channel: 'chrome' });
for (const w of [1280, 412]) try {
  const phone = w < 500, p = await (await b.newContext({ viewport: { width: w, height: 900 }, isMobile: phone, hasTouch: phone })).newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); } catch (e) {} });
  await p.goto('https://kickoff.kiwi/?x=' + now, { waitUntil: 'load' }); await p.waitForTimeout(5000);
  const r = await p.evaluate(() => ({ chips: [...document.querySelectorAll('#nowChips .nowchip')].map(x => x.textContent.trim()).join(' | '), cards: document.querySelectorAll('[data-open^="wiki-nationscup"]').length, badge: document.querySelector('[data-open^="wiki-nationscup"] .badge')?.textContent, pick: !!document.querySelector('[data-team="nationscup"]') }));
  out.push(`${w}: ${JSON.stringify(r)}; errors=${errs.length}`);
} catch (er) { out.push('err ' + String(er.message).slice(0, 160)); }
await b.close(); writeFileSync('probe/out-nc7.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/out-nc7.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
