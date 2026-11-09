// 10 Nov daily check: the live feed (public) after v648's run, its age and the version shown
import { execSync } from 'child_process'; import { writeFileSync } from 'fs';
const out = ['check ' + new Date().toISOString()]; let f;
for (let k = 0; k < 24; k++) { f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json(); if (Date.now() - Date.parse(f.generatedAt) < 15 * 6e4) break; await new Promise(r => setTimeout(r, 30000)); }
out.push('generatedAt ' + f.generatedAt + ' age min ' + Math.round((Date.now() - Date.parse(f.generatedAt)) / 6e4));
const h = await (await fetch('https://kickoff.kiwi/?x=' + Date.now())).text(); out.push('site v ' + (h.match(/>v(\d{3,4})</) || [])[1] + ' oneCardEveryDay ' + h.includes('in full`'));
writeFileSync('probe/out-feed10.json', JSON.stringify(f));
writeFileSync('probe/out-check10.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/out-feed10.json probe/out-check10.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
