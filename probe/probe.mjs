// daily 8 Nov (3): does TheSportsDB (free key) carry the WBBL and BBL, with results, so WBBL results needn't wait on Wikipedia?
// Prints counts and yes/no only: never a score or result
import { execSync } from 'child_process'; import { writeFileSync } from 'fs';
const out = ['daily3 ' + new Date().toISOString()];
const j = async q => (await fetch('https://www.thesportsdb.com/api/v1/json/123/' + q)).json();
try {
  const l = (await j('search_all_leagues.php?c=Australia&s=Cricket')).countries || [];
  for (const x of l) out.push(`league ${x.idLeague} ${x.strLeague}`);
  for (const x of l.filter(x => /Big Bash/i.test(x.strLeague))) {
    const past = (await j(`eventspastleague.php?id=${x.idLeague}`)).events || [];
    const next = (await j(`eventsnextleague.php?id=${x.idLeague}`)).events || [];
    out.push(`${x.strLeague}: past ${past.length}, next ${next.length}`);
    for (const e of past.slice(0, 5)) out.push(`  past ${e.strTimestamp} ${e.strHomeTeam} v ${e.strAwayTeam} season=${e.strSeason} round=${e.intRound} hasScore=${!!(e.intHomeScore || e.strResult)} status=${e.strStatus ? 'set' : 'none'}`);
    for (const e of next.slice(0, 3)) out.push(`  next ${e.strTimestamp} ${e.strHomeTeam} v ${e.strAwayTeam} season=${e.strSeason} round=${e.intRound}`);
    const ss = (await j(`eventsseason.php?id=${x.idLeague}&s=2026-2027`)).events || [];
    out.push(`  season 2026-2027: ${ss.length} events; 7 Nov games: ${ss.filter(e => /^2026-11-07/.test(e.strTimestamp || '')).map(e => `${e.strHomeTeam} v ${e.strAwayTeam} hasScore=${!!(e.intHomeScore || e.strResult)}`).join('; ')}`);
  }
} catch (er) { out.push('err ' + String(er.message).slice(0, 200)); }
writeFileSync('probe/out-daily3.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/out-daily3.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
