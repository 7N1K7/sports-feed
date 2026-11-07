// wnc: the World Rugby Nations Cup's Wikipedia pages (saved for the parser), TheSportsDB's leagues, and the NZ TV guide (names, dates and counts only)
import { execSync } from 'child_process'; import { writeFileSync } from 'fs';
const out = ['wnc ' + new Date().toISOString()], UA = { 'User-Agent': 'KickoffKiwiBot/1.0 (https://kickoff.kiwi)' };
const W = t => fetch('https://en.wikipedia.org/w/api.php?action=parse&format=json&prop=wikitext|sections&redirects=1&page=' + encodeURIComponent(t), { headers: UA }).then(r => r.json());
try {
  const s = await (await fetch('https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=20&srsearch=' + encodeURIComponent('"Nations Cup" 2026 rugby union World Rugby'), { headers: UA })).json();
  out.push('search: ' + s.query.search.map(x => x.title).join(' | '));
} catch (e) { out.push('search err ' + e.message); }
for (const t of ['2026 World Rugby Nations Cup', 'World Rugby Nations Cup', '2026 World Rugby Nations Cup Americas-Pacific Series', '2026 World Rugby Nations Cup European Series', '2026 World Rugby Nations Cup Northern Hemisphere Series', '2026 World Rugby Nations Cup Southern Hemisphere Series']) try {
  const r = await W(t); if (r.error) { out.push(`${t}: ${r.error.code}`); continue; }
  const wt = r.parse.wikitext['*'], f = 'probe/out-wnc-' + t.replace(/\W+/g, '_') + '.txt'; writeFileSync(f, wt);
  const boxes = (wt.match(/\{\{\s*rugby ?box/gi) || []).length;
  const teams = [...new Set((wt.match(/\|\s*(?:home|away)\s*=\s*([^\n|]+)/g) || []).map(x => x.replace(/^\|\s*(home|away)\s*=\s*/, '').trim()))].slice(0, 30);
  const dates = [...new Set((wt.match(/\|\s*date\s*=\s*([^\n|]+)/g) || []).map(x => x.replace(/^\|\s*date\s*=\s*/, '').trim()))].slice(0, 40);
  out.push(`${t} -> ${r.parse.title}: ${wt.length} chars, ${boxes} rugby boxes; sections: ${r.parse.sections.map(x => x.line).join(' / ').slice(0, 500)}`);
  out.push(`  teams: ${teams.join(' ; ')}`); out.push(`  dates: ${dates.join(' ; ')}`);
} catch (e) { out.push(`${t} err ${e.message}`); }
try {
  const l = await (await fetch('https://www.thesportsdb.com/api/v1/json/123/all_leagues.php')).json();
  out.push('tsdb rugby leagues with Nations: ' + (l.leagues || []).filter(x => /Rugby/i.test(x.strSport) && /Nation/i.test(x.strLeague)).map(x => `${x.idLeague} ${x.strLeague}`).join(' | '));
  const s = await (await fetch('https://www.thesportsdb.com/api/v1/json/123/search_all_leagues.php?s=Rugby')).json();
  out.push('tsdb search Nations: ' + (s.countries || s.countrys || []).filter(x => /Nation/i.test(x.strLeague)).map(x => `${x.idLeague} ${x.strLeague} badge=${x.strBadge ? 'yes' : 'no'} logo=${x.strLogo ? 'yes' : 'no'}`).join(' | '));
} catch (e) { out.push('tsdb err ' + e.message); }
for (const u of ['https://i.mjh.nz/SkySportNow/epg.xml', 'https://i.mjh.nz/SkyGo/epg.xml']) try {
  const x = await (await fetch(u)).text(); const t = [...new Set((x.match(/<title[^>]*>[^<]*Nations Cup[^<]*<\/title>/gi) || []).map(s => s.replace(/<[^>]+>/g, '')))].slice(0, 15);
  const c = [...new Set((x.match(/<title[^>]*>[^<]*(Spain|Uruguay|Georgia|Portugal|Chile|Canada|Romania|Samoa|Tonga|Zimbabwe)[^<]*Rugby[^<]*<\/title>|<title[^>]*>[^<]*Rugby[^<]*(Spain|Uruguay|Georgia|Portugal|Chile|Canada|Romania|Samoa|Tonga|Zimbabwe)[^<]*<\/title>/gi) || []).map(s => s.replace(/<[^>]+>/g, '')))].slice(0, 15);
  out.push(`${u.split('/')[3]}: Nations Cup titles: ${t.join(' | ') || 'none'}; rugby titles with those sides: ${c.join(' | ') || 'none'}`);
} catch (e) { out.push('epg err ' + e.message); }
writeFileSync('probe/out-wnc.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/out-wnc*.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
