import { writeFileSync } from 'fs';
const key = process.env.YOUTUBE_API_KEY, out = [];
const yt = async (p, q) => { const r = await fetch(`https://www.googleapis.com/youtube/v3/${p}?${q}&key=${key}`); return r.ok ? r.json() : { err: r.status }; };
const v = await yt('videos', 'part=snippet,contentDetails,liveStreamingDetails&id=EPeyvf9G3FQ');
for (const x of v.items || []) {
  out.push(`video: ${x.snippet.title} | channel ${x.snippet.channelTitle} ${x.snippet.channelId} | state ${x.snippet.liveBroadcastContent} | live ${JSON.stringify(x.liveStreamingDetails || {})} | region ${JSON.stringify(x.contentDetails?.regionRestriction || {})}`);
  out.push('desc: ' + (x.snippet.description || '').slice(0, 600).replace(/\n/g, ' / '));
  // the channel's other recent streams, to see what else it shows
  const pl = await yt('playlistItems', `part=contentDetails&maxResults=50&playlistId=UU${x.snippet.channelId.slice(2)}`);
  const ids = (pl.items || []).map(i => i.contentDetails.videoId);
  const vs = ids.length ? await yt('videos', `part=snippet,liveStreamingDetails&id=${ids.join(',')}`) : { items: [] };
  for (const s of vs.items || []) if (s.liveStreamingDetails) out.push(`  stream ${s.liveStreamingDetails.actualStartTime || s.liveStreamingDetails.scheduledStartTime} ${s.snippet.liveBroadcastContent} | ${s.snippet.title}`);
}
if (v.err) out.push('error ' + v.err);
writeFileSync('probe/out.txt', 'yt292\n' + out.join('\n').replace(/key=[^&\s]+/g, 'key=X') + '\n');
