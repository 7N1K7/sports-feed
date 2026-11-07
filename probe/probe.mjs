// wx2: the live feed's 2nd ODI: its weather field (from Wikipedia's rain note), and the Wikipedia read's cache state.
// Field names and the note's wording only, no scores
import { execSync } from 'child_process'; import { writeFileSync } from 'fs';
const out = ['wx2 ' + new Date().toISOString()];
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
out.push('feed ' + f.generatedAt + ' v' + f.site?.version);
const ev = f.events || [];
for (const e of ev.filter(e => e.sport === 'cricket' && /India/.test(e.away + e.home) && e.startUTC.startsWith('2026-11-07')))
  out.push(`${e.id} ${e.comp} | status ${e.status} | weather ${JSON.stringify(e.weather ?? null)} | progress ${JSON.stringify(e.progress ?? null)} | source ${e.source} | keys ${Object.keys(e).join(',')}`);
const w = f.diag?.wikipedia || {}; out.push('wiki diag for the tour: ' + JSON.stringify(Object.fromEntries(Object.entries(w).filter(([k]) => /India|New Zealand in/i.test(k)))).slice(0, 600));
out.push('diag keys with wiki/cache: ' + Object.keys(f.diag || {}).filter(k => /wiki|cache|tour/i.test(k)).join(', '));
writeFileSync('probe/out-wx.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -f probe/out-wx.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
