// daily 8 Nov: the live feed (saved for the missed-games check) and its age
import { execSync } from 'child_process'; import { writeFileSync } from 'fs';
const out = ['daily ' + new Date().toISOString()], now = Date.now();
try { const t = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + now)).text(); writeFileSync('probe/out-feed.json', t); const f = JSON.parse(t);
  out.push(`feed built ${f.generatedAt} (${Math.round((now - Date.parse(f.generatedAt)) / 6e4)} min ago), site v${f.site?.version}, checks keys: ${Object.keys(f.checks || {}).join(',') || 'none'}`);
} catch (er) { out.push('feed err ' + String(er.message).slice(0, 100)); }
writeFileSync('probe/out-daily.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/out-daily.txt probe/out-feed.json && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
