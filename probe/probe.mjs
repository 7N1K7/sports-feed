// nc4: where Zimbabwe/Samoa/Georgia games show as NC, and the second-tier competition's Wikipedia page (names only, no scores)
import { chromium } from 'playwright'; import { execSync } from 'child_process'; import { writeFileSync } from 'fs';
const out = ['nc4 ' + new Date().toISOString()], now = Date.now(), UA = { 'User-Agent': 'KickoffKiwiBot/1.0 (https://kickoff.kiwi)' };
const RX = /Zimbabwe|Samoa|Georgia|Tonga|Romania|Uruguay|Portugal|Spain|Chile|Canada|USA|United States|Namibia|Hong Kong|Belgium|Netherlands/;
try { const t = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + now)).text(); writeFileSync('probe/out-feed.json', t); const f = JSON.parse(t);
  out.push('feed built ' + f.generatedAt);
  for (const e of f.events || []) if (e.sport === 'rugby' && RX.test(`${e.home} ${e.away}`)) out.push(`feed: ${e.id} | ${e.startUTC?.slice(0, 10)} | ${e.home} v ${e.away} | comp=${e.comp} | src=${e.source} | team=${e.team} | tags=${(e.tags || []).join(',')}`);
  // the TV guide lines too, in case that's where they show
  const g = JSON.stringify(f).match(/[^"]{0,60}(Zimbabwe|Georgia v|v Georgia|Samoa v|v Samoa)[^"]{0,60}/g) || [];
  out.push('strings with those names: ' + [...new Set(g)].slice(0, 25).join(' || '));
} catch (er) { out.push('feed err ' + String(er.message).slice(0, 100)); }
for (const q of ['2026 World Rugby Nations Cup', '2026 Nations Cup rugby union', 'World Rugby Nations Cup', '2026 Nations Championship second division']) try {
  const r = await (await fetch('https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=6&srsearch=' + encodeURIComponent(q), { headers: UA })).json();
  out.push(`wiki search "${q}": ` + r.query.search.map(x => x.title).join(' | '));
} catch (er) { out.push('wiki err ' + String(er.message).slice(0, 80)); }
const b = await chromium.launch({ channel: 'chrome' });
try {
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await p.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); } catch (e) {} });
  await p.goto('https://kickoff.kiwi/?x=' + now, { waitUntil: 'load' }); await p.waitForTimeout(5000);
  const hits = await p.evaluate(rx => { const re = new RegExp(rx); const o = [];
    for (const el of document.querySelectorAll('[data-open], .ev, li, .row')) { const t = el.innerText || ''; if (re.test(t) && /\bNC\b|Nations/.test(t) && t.length < 400) o.push(((el.closest('section,[id]')?.id) || '?') + ': ' + t.replace(/\d+\s*[-–]\s*\d+/g, '#').replace(/\s+/g, ' ').slice(0, 160)); }
    return [...new Set(o)].slice(0, 15); }, RX.source);
  out.push('page hits: ' + (hits.join(' || ') || 'none'));
} catch (er) { out.push('err ' + String(er.message).slice(0, 160)); }
await b.close(); writeFileSync('probe/out-nc4.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/out-nc4.txt probe/out-feed.json && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
