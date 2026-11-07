// one3: TheSportsDB's ONE league (4495): its badge, next/past/season events (names and times only, no results); the Sky Sport Now guide's ESPN listings around a ONE night
import { execSync } from 'child_process'; import { writeFileSync } from 'fs';
const out = ['one3 ' + new Date().toISOString()];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const UA = { 'User-Agent': 'kickoff.kiwi probe (https://kickoff.kiwi)' };
const get = async (u, json = true) => { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(30000) }); if (!r.ok) throw new Error(String(r.status)); return json ? r.json() : r.text(); };
const T = 'https://www.thesportsdb.com/api/v1/json/123/';
const tsdb = async q => { for (let a = 0; a < 3; a++) { const r = await fetch(T + q, { headers: UA, signal: AbortSignal.timeout(20000) }); await sleep(6500); if (r.status === 429) { await sleep(20000); continue; } if (!r.ok) throw new Error(String(r.status)); return r.json(); } throw new Error('429'); };
const keep = e => ({ idEvent: e.idEvent, strEvent: e.strEvent, strEventAlternate: e.strEventAlternate, strSeason: e.strSeason, dateEvent: e.dateEvent, strTime: e.strTime, strTimestamp: e.strTimestamp, strTimeLocal: e.strTimeLocal, dateEventLocal: e.dateEventLocal, strVenue: e.strVenue, strCity: e.strCity, strCountry: e.strCountry, strStatus: e.strStatus, strPostponed: e.strPostponed, strPoster: e.strPoster, strThumb: e.strThumb, strBanner: e.strBanner, strSquare: e.strSquare, strVideo: e.strVideo ? 'yes' : '', idLeague: e.idLeague });
const save = {};
try {
  const L = (await tsdb('lookupleague.php?id=4495')).leagues?.[0] || {};
  out.push(`league 4495: ${L.strLeague} | alt ${L.strLeagueAlternate} | ${L.strSport} | season ${L.strCurrentSeason} | badge ${L.strBadge} | logo ${L.strLogo} | poster ${L.strPoster} | banner ${L.strBanner} | trophy ${L.strTrophy} | col ${L.strColour1}/${L.strColour2}/${L.strColour3} | web ${L.strWebsite}`);
  for (const [k, u] of [['badge', L.strBadge], ['logo', L.strLogo]]) if (u) { const r = await fetch(u + '/small', { signal: AbortSignal.timeout(20000) }); if (r.ok) writeFileSync(`probe/out-one-${k}.png`, Buffer.from(await r.arrayBuffer())); out.push(`${k} small: ${r.status}`); }
  for (const q of ['eventsnextleague.php?id=4495', 'eventspastleague.php?id=4495', 'eventsseason.php?id=4495&s=2026', 'eventsseason.php?id=4495&s=2027']) {
    try { const ev = (await tsdb(q)).events || []; save[q] = ev.map(keep); out.push(`# ${q}: ${ev.length}`); for (const e of ev.map(keep)) out.push(`  ${e.idEvent} | ${e.strEvent} | ${e.dateEvent} ${e.strTime} | ts ${e.strTimestamp} | local ${e.dateEventLocal} ${e.strTimeLocal} | ${e.strVenue} | ${e.strCity} | ${e.strStatus} | ${e.strPoster ? 'P' : ''}${e.strThumb ? 'T' : ''}`); } catch (e) { out.push(q + ' ' + e.message); }
  }
} catch (e) { out.push('tsdb error: ' + e.message); }
// ESPN listings on Sky Sport Now: 6 Nov 00:00Z to 8 Nov 00:00Z (titles only), and any listing naming ONE
try {
  const xml = await get('https://i.mjh.nz/SkySportNow/epg.xml', false);
  const ch = Object.fromEntries([...xml.matchAll(/<channel id="([^"]+)"[^>]*>\s*<display-name[^>]*>([^<]+)/g)].map(m => [m[1], m[2].trim()]));
  let lo = '20261106000000', hi = '20261108000000', n = 0, all = [];
  for (const p of xml.matchAll(/<programme ([^>]*)>([\s\S]*?)<\/programme>/g)) {
    const a = k => (p[1].match(new RegExp(`\\b${k}="([^"]+)"`)) || [])[1] || '';
    const title = (p[2].match(/<title[^>]*>([^<]*)/) || [])[1] || '', sub = (p[2].match(/<sub-title[^>]*>([^<]*)/) || [])[1] || '';
    const c = ch[a('channel')], s = a('start').slice(0, 14);
    if (/^ESPN/.test(c) && s >= lo && s < hi) out.push(`  ${c} | ${a('start')} | ${title.slice(0, 60)} | ${sub.slice(0, 50)}`);
    if (/\bONE\b/.test(title + ' ' + sub) || /ONE Championship|Fight Night|Lumpinee|Samurai/i.test(title + ' ' + sub)) all.push(`  ONE? ${c} | ${a('start')} - ${a('stop')} | ${title.slice(0, 60)} | ${sub.slice(0, 50)}`);
  }
  out.push('# listings naming ONE:', ...all.slice(0, 40));
} catch (e) { out.push('epg ' + e.message); }
writeFileSync('probe/out-one.txt', out.join('\n') + '\n'); writeFileSync('probe/out-one-tsdb.json', JSON.stringify(save));
try { execSync('git -c user.name=bot -c user.email=bot@x add -f probe/out-one.txt probe/out-one-tsdb.json probe/out-one-*.png && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log('done');
