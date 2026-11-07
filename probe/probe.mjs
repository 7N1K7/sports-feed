// daily 8 Nov (2): why the WBBL games of 7 Nov have no result, and how many A-League Men games TheSportsDB lists for rounds 5 to 8
// Prints yes/no, counts and fixtures only: never a score or result
import { execSync } from 'child_process'; import { writeFileSync } from 'fs';
import { wikiEvents } from './sources.mjs';
const out = ['daily2 ' + new Date().toISOString()];
const UA = { 'User-Agent': 'KickoffKiwiProbe/1.0 (https://kickoff.kiwi)' };
try {
  const title = "2026–27 Women's Big Bash League season";
  const j = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=parse&prop=wikitext|revid&page=' + encodeURIComponent(title), { headers: UA })).json();
  const w = j.parse?.wikitext || '';
  out.push(`WBBL page: ${w.length} chars, rev ${j.parse?.revid}`);
  // every match block mentioning 7 November
  const blocks = w.split(/\{\{\s*(?=Single-innings cricket match|Limited overs matches|cricket match)/i);
  for (const b of blocks) {
    if (!/7 November/.test(b.slice(0, 600))) continue;
    const f = {}; for (const m of b.slice(0, 3000).matchAll(/\|\s*([a-z0-9_]+)\s*=\s*([^\n|]*)/gi)) f[m[1]] = m[2].trim();
    const names = Object.keys(f);
    out.push(`  block: team1=${(f.team1||'').replace(/[^A-Za-z ]/g,'').slice(0,40)} team2=${(f.team2||'').replace(/[^A-Za-z ]/g,'').slice(0,40)} fields=${names.slice(0,30).join(',')}`);
    out.push(`    score1 filled: ${!!f.score1}, score2 filled: ${!!f.score2}, result filled: ${!!f.result}, rain/abandoned word anywhere: ${/abandon|no result|rain|washed/i.test(b.slice(0,3000)) ? 'yes' : 'no'}`);
  }
  const diag = {};
  const r = await wikiEvents([{ title: "{S} Women's Big Bash League season", sport: 'cricket', comp: "Women's Big Bash League", team: 'wbbl', tz: 'Australia/Sydney', timesTz: 'Australia/Sydney', showRound: true }], n => 'Australia/Sydney', diag);
  const evs = (r.events || r).filter?.(e => /^2026-11-0[678]/.test(e.startUTC)) || [];
  for (const e of evs) out.push(`  parsed ${e.startUTC} ${e.home} v ${e.away}: status=${e.status} hasScore=${!!e.score}`);
  out.push('  diag ' + JSON.stringify(diag).slice(0, 300));
} catch (er) { out.push('wbbl err ' + String(er.stack).slice(0, 300)); }
try {
  for (const s of ['2026-2027']) for (const r of [5, 6, 7, 8]) {
    const d = await (await fetch(`https://www.thesportsdb.com/api/v1/json/123/eventsround.php?id=4356&r=${r}&s=${s}`)).json();
    const ev = d.events || [];
    out.push(`ALM ${s} round ${r}: ${ev.length} games`);
    for (const e of ev) out.push(`   ${e.strTimestamp} ${e.strHomeTeam} v ${e.strAwayTeam} (${e.strStatus || ''})`.replace(/\(Match Finished\)|\(FT\)/, '(done)'));
  }
} catch (er) { out.push('alm err ' + String(er.message).slice(0, 200)); }
writeFileSync('probe/out-daily2.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/out-daily2.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
