// daily 8 Nov (4): the live feed after v631, its checks as counts and labels only
import { execSync } from 'child_process'; import { writeFileSync } from 'fs';
const out = ['daily4 ' + new Date().toISOString()], now = Date.now();
try { const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + now)).json();
  out.push(`feed built ${f.generatedAt} (${Math.round((now - Date.parse(f.generatedAt)) / 6e4)} min ago), site v${f.site?.version}`);
  out.push(`noResult ${f.checks?.noResult?.length}: ${(f.checks?.noResult || []).map(x => x.c).join(' | ')}`);
  out.push(`thinWeeks ${f.checks?.thinWeeks?.length}: ${(f.checks?.thinWeeks || []).map(x => `${x.c} ${x.week}`).join(' | ')}`);
} catch (er) { out.push('feed err ' + String(er.message).slice(0, 100)); }
writeFileSync('probe/out-daily4.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/out-daily4.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
