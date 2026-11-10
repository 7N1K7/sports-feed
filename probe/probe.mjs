// 10 Nov: a Dean Jones Trophy logo we may use? TheSportsDB (key 123) leagues, and Commons files with their licences
import { execSync } from 'child_process'; import { writeFileSync } from 'fs';
const out = ['djt ' + new Date().toISOString()]; const j = async u => { try { return await (await fetch(u, { headers: { 'User-Agent': 'kickoff-kiwi-probe' } })).json(); } catch (e) { return { err: String(e) }; } };
const L = await j('https://www.thesportsdb.com/api/v1/json/123/search_all_leagues.php?c=Australia&s=Cricket');
for (const l of (L.countries || L.countrys || [])) out.push(`tsdb ${l.idLeague} ${l.strLeague} | alt ${l.strLeagueAlternate || ''} | badge ${l.strBadge || ''} | logo ${l.strLogo || ''}`);
for (const q of ['Dean Jones Trophy', 'Marsh One-Day Cup', 'One-Day Cup cricket logo']) {
  const r = await j('https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srnamespace=6&srlimit=8&srsearch=' + encodeURIComponent(q));
  for (const s of r.query?.search || []) {
    const i = await j('https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&titles=' + encodeURIComponent(s.title));
    const p = Object.values(i.query?.pages || {})[0]; const m = p?.imageinfo?.[0]?.extmetadata || {};
    out.push(`commons [${q}] ${s.title} | ${m.LicenseShortName?.value || '?'} | ${p?.imageinfo?.[0]?.url || ''}`);
  }
}
const w = await j('https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages|images&piprop=original&titles=Dean_Jones_Trophy&redirects=1');
const wp = Object.values(w.query?.pages || {})[0]; out.push('enwiki page image ' + (wp?.original?.source || 'none') + ' | images ' + (wp?.images || []).map(x => x.title).join(', '));
writeFileSync('probe/out-djt.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/out-djt.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
