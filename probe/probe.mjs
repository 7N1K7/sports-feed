// one1: scope ONE Championship sources (TheSportsDB free key, Wikipedia). No results printed: names, dates, counts only.
import { execSync } from 'child_process'; import { writeFileSync } from 'fs';
const out = ['one1 ' + new Date().toISOString()];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const UA = { 'User-Agent': 'kickoff.kiwi probe (https://kickoff.kiwi)' };
const get = async (u, json = true) => { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(20000) }); if (!r.ok) throw new Error(r.status + ' ' + u); return json ? r.json() : r.text(); };
const T = 'https://www.thesportsdb.com/api/v1/json/123/';
const tsdb = async q => { const j = await get(T + q); await sleep(2500); return j; };
const evLine = e => [e.idEvent, e.strEvent, e.dateEvent, e.strTime, e.strTimestamp, e.strTimeLocal, e.strVenue, e.strCity, e.strCountry, e.strStatus, e.strPoster ? 'poster' : '', e.strThumb ? 'thumb' : ''].join(' | ');
const save = {};
try {
  for (const s of ['Fighting', 'MMA']) {
    try { const j = await tsdb(`search_all_leagues.php?s=${s}`); const ls = j.countries || j.leagues || [];
      out.push(`# tsdb leagues s=${s}: ${ls.length}`); for (const l of ls) out.push(`${l.idLeague} | ${l.strLeague} | ${l.strSport} | ${l.strCountry} | ${l.strCurrentSeason}`); } catch (e) { out.push(`leagues ${s}: ${e.message}`); }
  }
  const all = await tsdb('all_leagues.php'); const one = (all.leagues || []).filter(l => /\bONE\b|onefc/i.test(l.strLeague) || /fight/i.test(l.strSport));
  out.push(`# all_leagues fight/ONE: ` + one.map(l => `${l.idLeague} ${l.strLeague} (${l.strSport})`).join('; '));
  const ids = [...new Set([...(all.leagues || []).filter(l => /\bONE\b/i.test(l.strLeague)).map(l => l.idLeague)])];
  for (const id of ids) {
    const L = (await tsdb(`lookupleague.php?id=${id}`)).leagues?.[0] || {};
    out.push(`## league ${id} ${L.strLeague} alt=${L.strLeagueAlternate} season=${L.strCurrentSeason} badge=${L.strBadge} logo=${L.strLogo} banner=${L.strBanner} poster=${L.strPoster} fanart=${L.strFanart1} col=${L.strColour1}/${L.strColour2}/${L.strColour3} web=${L.strWebsite} yt=${L.strYoutube}`);
    for (const q of [`eventsnextleague.php?id=${id}`, `eventspastleague.php?id=${id}`]) {
      const ev = (await tsdb(q)).events || []; out.push(`${q}: ${ev.length}`); for (const e of ev) out.push('  ' + evLine(e));
    }
    for (const s of ['2026', '2025-2026', '2025']) {
      const ev = (await tsdb(`eventsseason.php?id=${id}&s=${s}`)).events || []; out.push(`season ${s}: ${ev.length}`);
      save[`${id}-${s}`] = ev.map(({ strResult, intHomeScore, intAwayScore, strDescriptionEN, ...e }) => e);
      for (const e of ev) out.push('  ' + evLine(e));
    }
  }
} catch (e) { out.push('tsdb error: ' + e.message); }
// Wikipedia
const W = 'https://en.wikipedia.org/w/api.php?format=json&formatversion=2&';
try {
  const r = await get(W + 'action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(['List of ONE Championship events', '2026 in ONE Championship', '2025 in ONE Championship', 'ONE Friday Fights', 'ONE Fight Night'].join('|')));
  for (const pg of r.query.pages) {
    const tx = pg.revisions?.[0]?.slots?.main?.content || '';
    out.push(`# wiki ${pg.title}: ${pg.missing ? 'MISSING' : tx.length + ' chars'}`);
    if (!tx) continue;
    save['wiki-' + pg.title] = tx;
    out.push('headings: ' + [...tx.matchAll(/^(={2,4})\s*(.+?)\s*\1\s*$/gm)].map(m => m[1].length + ':' + m[2]).slice(0, 80).join(' / '));
    out.push(`MMAevent card: ${(tx.match(/\{\{\s*MMAevent card/gi) || []).length}, bout: ${(tx.match(/\{\{\s*MMAevent bout/gi) || []).length}, Friday Fights: ${(tx.match(/Friday Fights/g) || []).length}, dts: ${(tx.match(/\{\{\s*dts/gi) || []).length}, times like 'p.m.': ${(tx.match(/\d{1,2}(:\d\d)?\s*[ap]\.?m\.?/gi) || []).length}, ICT: ${(tx.match(/\bICT\b|UTC\+7/g) || []).length}`);
    if (/List of ONE/.test(pg.title)) { const i = tx.search(/==\s*Scheduled events\s*==/i); out.push('SCHEDULED RAW: ' + (i >= 0 ? tx.slice(i, i + 3500) : 'none')); const j = tx.search(/==\s*Past events\s*==/i); out.push('PAST RAW (head): ' + (j >= 0 ? tx.slice(j, j + 1500) : 'none')); }
    if (/^2026 in/.test(pg.title)) { out.push('HEAD RAW: ' + tx.slice(0, 2500)); const k = tx.search(/ONE Fight Night/); out.push('first ONE FN at ' + k); }
  }
} catch (e) { out.push('wiki error: ' + e.message); }
writeFileSync('probe/out-one.txt', out.join('\n') + '\n'); writeFileSync('probe/out-one.json', JSON.stringify(save));
try { execSync('git -c user.name=bot -c user.email=bot@x add -f probe/out-one.txt probe/out-one.json && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log('done');
