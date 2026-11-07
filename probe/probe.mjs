// wnc2: the Nations Cup's November page (saved for the parser) and the NZ TV guide's Nations Cup listings (times, channels, team names only)
import { execSync } from 'child_process'; import { writeFileSync } from 'fs';
const out = ['wnc2 ' + new Date().toISOString()], UA = { 'User-Agent': 'KickoffKiwiBot/1.0 (https://kickoff.kiwi)' };
for (const t of ['2026 World Rugby Nations Cup European-African-Asian Series']) try {
  const r = await (await fetch('https://en.wikipedia.org/w/api.php?action=parse&format=json&prop=wikitext|sections&redirects=1&page=' + encodeURIComponent(t), { headers: UA })).json();
  if (r.error) { out.push(`${t}: ${r.error.code}`); continue; }
  const wt = r.parse.wikitext['*']; writeFileSync('probe/out-wnc-' + t.replace(/\W+/g, '_') + '.txt', wt);
  out.push(`${t} -> ${r.parse.title}: ${wt.length} chars, ${(wt.match(/\{\{\s*rugby ?box/gi) || []).length} rugby boxes; sections: ${r.parse.sections.map(x => x.line).join(' / ').slice(0, 700)}`);
} catch (e) { out.push(`${t} err ${e.message}`); }
for (const u of ['https://i.mjh.nz/SkySportNow/epg.xml', 'https://i.mjh.nz/SkyGo/epg.xml']) try {
  const x = await (await fetch(u)).text();
  const ch = Object.fromEntries([...x.matchAll(/<channel id="([^"]+)">[\s\S]*?<display-name[^>]*>([^<]+)</g)].map(m => [m[1], m[2]]));
  const progs = [...x.matchAll(/<programme start="([^"]+)" stop="[^"]+" channel="([^"]+)"[^>]*>([\s\S]*?)<\/programme>/g)].filter(m => /Nations Cup/i.test(m[3]) && /Rugby/i.test(m[3]));
  out.push(`${u.split('/')[3]}: ${progs.length} Nations Cup listings`);
  for (const m of progs.slice(0, 30)) { const sub = (m[3].match(/<sub-title[^>]*>([^<]*)</) || [])[1] || '', desc = ((m[3].match(/<desc[^>]*>([^<]*)</) || [])[1] || '').replace(/\d+\s*[-–]\s*\d+/g, '#').slice(0, 90);
    out.push(`  ${m[1]} | ${ch[m[2]] || m[2]} | sub=${sub} | live=${/<live|Live\b|LIVE/.test(m[3]) ? 'y' : 'n'} | ${desc}`); }
} catch (e) { out.push('epg err ' + e.message); }
writeFileSync('probe/out-wnc2.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/out-wnc*.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
