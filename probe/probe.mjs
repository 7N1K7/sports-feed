// 8 Nov: what the NZ guide lists for today's UFC Fight Night (channels, times, programme titles and descriptions'
// first words, which say prelims or main card: no results)
import { execSync } from 'child_process'; import { writeFileSync } from 'fs';
const out = ['ufc ' + new Date().toISOString()];
for (const url of ['https://i.mjh.nz/nz/epg.xml', 'https://i.mjh.nz/SkyGo/epg.xml']) {
  try { const x = await (await fetch(url)).text();
    const ch = {}; for (const m of x.matchAll(/<channel id="([^"]+)">[\s\S]*?<display-name>([^<]+)<\/display-name>/g)) ch[m[1]] = m[2];
    for (const m of x.matchAll(/<programme start="(\d{14}) ([+-]\d{4})" stop="(\d{14}) ([+-]\d{4})" channel="([^"]+)">([\s\S]*?)<\/programme>/g)) {
      const body = m[6], title = (body.match(/<title[^>]*>([^<]*)/) || [])[1] || '', desc = (body.match(/<desc[^>]*>([^<]*)/) || [])[1] || '';
      if (!/UFC|Fight Night/i.test(title + ' ' + desc)) continue;
      if (!/^2026110[78]/.test(m[1])) continue;
      out.push(`${url.split('/')[3]} ${ch[m[5]] || m[5]} ${m[1]} ${m[2]} -> ${m[3]} | ${title} | ${desc.slice(0, 160)}`);
    }
  } catch (er) { out.push(url + ' err ' + String(er.message).slice(0, 100)); }
}
writeFileSync('probe/out-ufc.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/out-ufc.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
