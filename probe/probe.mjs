// probe 233: Fox Cricket's YouTube channel (@foxcricket): its id, and its recent live streams (titles, times, NZ blocked?)
import fs from 'fs';
const key = process.env.YOUTUBE_API_KEY, L = [];
const yt = async (p, q) => { const r = await fetch(`https://www.googleapis.com/youtube/v3/${p}?${q}&key=${key}`); return r.ok ? r.json() : { error: r.status }; };
const c = await yt('channels', 'part=id,snippet,contentDetails&forHandle=foxcricket');
const ch = c.items?.[0]; L.push(`channel ${ch?.id} ${ch?.snippet?.title} | ${c.error || ''}`);
if (ch) {
  const pl = await yt('playlistItems', `part=contentDetails&maxResults=50&playlistId=UU${ch.id.slice(2)}`);
  const ids = (pl.items || []).map(x => x.contentDetails.videoId);
  const v = ids.length ? await yt('videos', `part=snippet,contentDetails,liveStreamingDetails&id=${ids.join(',')}`) : { items: [] };
  const all = v.items || [];
  L.push(`${all.length} recent uploads; streams:`);
  for (const x of all.filter(x => x.liveStreamingDetails)) { const r = x.contentDetails?.regionRestriction; L.push(`${x.liveStreamingDetails.actualStartTime || x.liveStreamingDetails.scheduledStartTime} | ${x.snippet.title.slice(0, 100)} | ${x.contentDetails.duration} | region ${r ? JSON.stringify(r).slice(0, 80) : 'open'}`); }
  L.push('a sample of other uploads:'); for (const x of all.filter(x => !x.liveStreamingDetails).slice(0, 15)) L.push(`${x.snippet.publishedAt.slice(0, 10)} | ${x.snippet.title.slice(0, 100)} | ${x.contentDetails.duration}`);
}
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
