// 8 Nov: NZ A v India A's YouTube links in the live feed, and NZ Cricket's recent streams (ids, times, states, day
// numbers only: never a title, which can carry a result)
import { execSync } from 'child_process'; import { writeFileSync } from 'fs';
const out = ['nza ' + new Date().toISOString()], now = Date.now();
try { const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + now)).json();
  out.push(`feed ${f.generatedAt} v${f.site?.version}`);
  for (const e of f.events.filter(e => /India A/.test(e.away || '') && /3rd/.test(e.comp || ''))) out.push(`game ${e.startUTC} status=${e.status} yt=${JSON.stringify(e.yt || [])} tv=${JSON.stringify(e.tv || [])} broadcast=${e.broadcast || ''} watchAlt=${e.watchAlt || ''}`);
} catch (er) { out.push('feed err ' + String(er.message).slice(0, 100)); }
try {
  const key = process.env.YOUTUBE_API_KEY, id = 'UCuKowzPg2-A0FcmyPa3yWug';
  const pl = await (await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=25&playlistId=UU${id.slice(2)}&key=${key}`)).json();
  const ids = (pl.items || []).map(x => x.contentDetails.videoId);
  const v = await (await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${ids.join(',')}&key=${key}`)).json();
  for (const x of v.items || []) { if (!x.liveStreamingDetails) continue; const t = x.snippet.title, day = (t.match(/day\s*(\d)/i) || [])[1] || '-';
    out.push(`stream ${x.id} state=${x.snippet.liveBroadcastContent} sched=${x.liveStreamingDetails.scheduledStartTime || ''} start=${x.liveStreamingDetails.actualStartTime || ''} end=${x.liveStreamingDetails.actualEndTime || ''} day=${day} indiaA=${/india a/i.test(t)} nzA=${/(nz|new zealand) a\b/i.test(t)} hl=${/highlight/i.test(t)}`); }
} catch (er) { out.push('yt err ' + String(er.message).slice(0, 100)); }
writeFileSync('probe/out-nza.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -A probe/out-nza.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
