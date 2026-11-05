import { writeFileSync } from 'fs';
const out = [];
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
out.push(`feed ${f.generatedAt} v${f.site?.version}`, JSON.stringify(f.checks || {}), 'youtube diag: ' + String(f.diag?.youtube || '').replace(/key=[^&\s]+/g, 'key=…').slice(0, 600));
const wiban = (f.events || []).filter(e => /West Indies|Bangladesh/.test(`${e.home} ${e.away}`) && Math.abs(Date.parse(e.startUTC) - Date.now()) < 10 * 864e5).map(e => `${e.startUTC} ${e.comp} ${e.home} v ${e.away} | ${e.broadcast || ''} | ${e.watchAlt || ''} | yt ${JSON.stringify((e.yt || []).map(y => y.ch))}`);
out.push('WI/BAN:', ...wiban);
const key = process.env.YOUTUBE_API_KEY;
const yt = async (p, q) => { const r = await fetch(`https://www.googleapis.com/youtube/v3/${p}?${q}&key=${key}`); if (!r.ok) return { err: r.status }; return r.json(); };
const ch = await yt('channels', 'part=id,snippet,contentDetails&forHandle=RabbitholebdSports');
const c = ch.items?.[0]; out.push('channel: ' + (c ? `${c.id} | ${c.snippet.title} | ${c.snippet.country || ''} | ${c.snippet.description.slice(0, 200).replace(/\n/g, ' ')}` : JSON.stringify(ch).slice(0, 200)));
if (c) {
  const pl = await yt('playlistItems', `part=contentDetails&maxResults=50&playlistId=UU${c.id.slice(2)}`);
  const ids = (pl.items || []).map(x => x.contentDetails.videoId);
  const v = await yt('videos', `part=snippet,contentDetails,liveStreamingDetails&id=${ids.join(',')}`);
  for (const x of v.items || []) if (x.liveStreamingDetails) out.push(`  ${x.snippet.liveBroadcastContent} ${x.liveStreamingDetails.actualStartTime || x.liveStreamingDetails.scheduledStartTime} | ${x.snippet.title.slice(0, 90)} | region ${JSON.stringify(x.contentDetails.regionRestriction || {})}`);
}
const s = await yt('search', 'part=snippet&type=video&eventType=completed&maxResults=15&regionCode=NZ&q=' + encodeURIComponent('West Indies vs Bangladesh live'));
out.push('search:', ...(s.items || []).map(x => `  ${x.snippet.channelTitle} (${x.snippet.channelId}) | ${x.snippet.title.slice(0, 80)}`), s.err ? 'search err ' + s.err : '');
writeFileSync('probe/out.txt', out.join('\n') + '\n');
