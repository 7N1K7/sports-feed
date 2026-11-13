// 10 Nov: the 3rd ODI's rain delay: when does the live feed show it? Every 4 min for 80 min: yes/no flags only, no scores
import { execSync } from 'child_process'; import { writeFileSync } from 'fs';
const out = ['rain watch from ' + new Date().toISOString()];
const save = () => { writeFileSync('probe/out-rain.txt', out.join('\n') + '\n');
  try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/out-rain.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
  for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} } };
const RAIN = /\b(rain|wet|drizzle|covers|delay|delayed|outfield)\b/i;
for (let k = 0; k < 20; k++) {
  try {
    const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json(); const e = f.events.find(x => x.id === 'bc-ind-odi3-2026') || {};
    out.push(`${new Date().toISOString().slice(11, 16)}Z feed ${String(f.generatedAt).slice(11, 16)} status ${e.status} progress ${e.progress ? 'yes' : 'no'} progressRain ${RAIN.test(e.progress || '')} wxNews ${e.wxNews ? 'yes' : 'no'} wxRain ${RAIN.test(e.wxNews?.title || '')} liveScore ${e.liveScore || e.liveS ? 'yes' : 'no'}`);
  } catch (err) { out.push('err ' + err.message); }
  save(); if (k < 19) await new Promise(r => setTimeout(r, 4 * 6e4));
}
