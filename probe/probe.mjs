// one2: ONE Championship times: TheSportsDB search, ONE's YouTube live streams, the Sky Sport Now guide. Names, times, counts only (no results).
import { execSync } from 'child_process'; import { writeFileSync, rmSync } from 'fs';
const out = ['one2 ' + new Date().toISOString()];
try { rmSync('probe/out-one.json'); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const UA = { 'User-Agent': 'kickoff.kiwi probe (https://kickoff.kiwi)' };
const get = async (u, json = true) => { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(30000) }); if (!r.ok) throw new Error(String(r.status)); return json ? r.json() : r.text(); };
const T = 'https://www.thesportsdb.com/api/v1/json/123/';
const tsdb = async q => { const j = await get(T + q); await sleep(2500); return j; };
const evLine = e => [e.idEvent, e.idLeague, e.strLeague, e.strEvent, e.dateEvent, e.strTime, e.strTimestamp, e.strVenue, e.strCity, e.strCountry, e.strStatus, e.strPoster ? 'poster' : '', e.strThumb ? 'thumb' : ''].join(' | ');
const leagues = new Set();
try {
  for (const q of ['search_all_leagues.php?c=Singapore', 'search_all_leagues.php?c=Thailand', 'search_all_leagues.php?c=Singapore&s=Fighting', 'search_all_leagues.php?c=Thailand&s=Fighting', 'search_all_leagues.php?c=Japan&s=Fighting', 'search_all_leagues.php?c=Worldwide&s=Fighting', 'search_all_leagues.php?c=United%20States&s=Fighting']) {
    try { const j = await tsdb(q); const ls = j.countries || j.leagues || []; out.push(`# ${q}: ${ls.length}: ` + ls.map(l => `${l.idLeague} ${l.strLeague} (${l.strSport})`).join('; ')); } catch (e) { out.push(`${q}: ${e.message}`); }
  }
  for (const s of ['ONE Fight Night 49', 'ONE Fight Night 50', 'ONE Samurai 5', 'ONE Friday Fights 179', 'ONE Fight Night', 'ONE Championship', 'ONE_Fight_Night_48']) {
    try { const ev = (await tsdb(`searchevents.php?e=${encodeURIComponent(s)}`)).event || []; out.push(`# searchevents ${s}: ${ev.length}`); for (const e of ev.slice(0, 8)) { out.push('  ' + evLine(e)); leagues.add(e.idLeague); } } catch (e) { out.push(`searchevents ${s}: ${e.message}`); }
  }
  for (const id of [...leagues].filter(Boolean).slice(0, 3)) {
    try { const L = (await tsdb(`lookupleague.php?id=${id}`)).leagues?.[0] || {}; out.push(`## league ${id} ${L.strLeague} alt=${L.strLeagueAlternate} sport=${L.strSport} season=${L.strCurrentSeason} badge=${L.strBadge} logo=${L.strLogo} col=${L.strColour1}/${L.strColour2}`); } catch (e) { out.push('lookup ' + e.message); }
    for (const q of [`eventsnextleague.php?id=${id}`, `eventspastleague.php?id=${id}`, `eventsseason.php?id=${id}&s=2026`]) {
      try { const ev = (await tsdb(q)).events || []; out.push(`${q}: ${ev.length}`); for (const e of ev.filter(e => e.dateEvent >= '2026-01-01')) out.push('  ' + evLine(e)); } catch (e) { out.push(q + ' ' + e.message); }
    }
  }
} catch (e) { out.push('tsdb error: ' + e.message); }
// ONE's YouTube channel: its live streams (scheduled start times), and whether NZ can watch them
const key = process.env.YOUTUBE_API_KEY;
try {
  const yt = async (path, q) => { const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${q}&key=${key}`, { signal: AbortSignal.timeout(20000) }); if (!r.ok) throw new Error(`${path} ${r.status}`); return r.json(); };
  for (const h of ['@ONEChampionship', '@ONEChampionshipJapan', '@ONELumpinee']) {
    const c = (await yt('channels', `part=id,snippet,contentDetails&forHandle=${encodeURIComponent(h)}`)).items?.[0];
    if (!c) { out.push(`# yt ${h}: none`); continue; }
    out.push(`# yt ${h}: ${c.id} ${c.snippet.title} country=${c.snippet.country}`);
    const ids = ((await yt('playlistItems', `part=contentDetails&maxResults=50&playlistId=${c.contentDetails.relatedPlaylists.uploads}`)).items || []).map(x => x.contentDetails.videoId);
    const v = ids.length ? (await yt('videos', `part=snippet,contentDetails,liveStreamingDetails&id=${ids.join(',')}`)).items || [] : [];
    const shut = x => { const r = x.contentDetails?.regionRestriction; return !!r && (r.allowed ? !r.allowed.includes('NZ') : !!r.blocked?.includes('NZ')); };
    const ls = v.filter(x => x.liveStreamingDetails);
    out.push(`uploads ${v.length}, streams ${ls.length}, shut to NZ ${v.filter(shut).length}`);
    for (const x of ls) {
      const t = x.snippet.title, ev = (t.match(/ONE (Friday Fights|Fight Night|Samurai|Lumpinee)\s*\d+|ONE \d{3}|The Inner Circle \d+/i) || [])[0] || '(other)';
      const L = x.liveStreamingDetails;
      out.push(`  ${x.snippet.liveBroadcastContent} | ${ev} | sched ${L.scheduledStartTime || ''} | actual ${L.actualStartTime || ''} | NZ ${shut(x) ? 'shut' : 'open'} | ${x.snippet.liveBroadcastContent !== 'none' ? t.slice(0, 90) : ''}`);
    }
  }
} catch (e) { out.push('yt error: ' + e.message); }
// the Sky Sport Now guide (ESPN is on it) and the free-to-air guide
for (const url of ['https://i.mjh.nz/SkySportNow/epg.xml', 'https://i.mjh.nz/nz/epg.xml']) {
  try {
    const xml = await get(url, false);
    const ch = Object.fromEntries([...xml.matchAll(/<channel id="([^"]+)"[^>]*>\s*<display-name[^>]*>([^<]+)/g)].map(m => [m[1], m[2].trim()]));
    out.push(`# ${url}: ${xml.length} chars, channels: ${Object.values(ch).join(', ').slice(0, 400)}`);
    let n = 0;
    for (const p of xml.matchAll(/<programme ([^>]*)>([\s\S]*?)<\/programme>/g)) {
      const a = k => (p[1].match(new RegExp(`\\b${k}="([^"]+)"`)) || [])[1] || '';
      const title = (p[2].match(/<title[^>]*>([^<]*)/) || [])[1] || '', sub = (p[2].match(/<sub-title[^>]*>([^<]*)/) || [])[1] || '', desc = (p[2].match(/<desc[^>]*>([^<]*)/) || [])[1] || '';
      if (!/\bONE (Championship|Fight Night|Friday Fights|Samurai|Lumpinee|FC)\b|\bONE \d{3}\b/.test(`${title} ${sub}`)) continue;
      if (n++ < 60) out.push(`  ${ch[a('channel')]} | ${a('start')} - ${a('stop')} | ${title.slice(0, 70)} | ${sub.slice(0, 60)} | live:${/\blive\b/i.test(title + sub + desc)} | cats ${[...p[2].matchAll(/<category[^>]*>([^<]+)/g)].map(x => x[1]).join(',')}`);
    }
    out.push(`  ${n} ONE listings`);
  } catch (e) { out.push(`${url}: ${e.message}`); }
}
writeFileSync('probe/out-one.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/out-one.json; git -c user.name=bot -c user.email=bot@x add -f probe/out-one.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log('done');
