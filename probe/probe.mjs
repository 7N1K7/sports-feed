// probe 247: the YouTube video the owner sent: its channel, and that channel's recent live streams (no key printed)
import fs from 'fs';
const L = [], K = process.env.YOUTUBE_API_KEY;
const yt = async (path, q) => (await fetch(`https://www.googleapis.com/youtube/v3/${path}?${q}&key=${K}`)).json();
const v = (await yt('videos', 'part=snippet,liveStreamingDetails,contentDetails,status&id=TGYqxxx4K8g')).items?.[0];
if (!v) L.push('no video'); else {
  L.push(`video: ${v.snippet.title} | channel ${v.snippet.channelTitle} ${v.snippet.channelId} | live ${JSON.stringify(v.liveStreamingDetails || {})} | region ${JSON.stringify(v.contentDetails?.regionRestriction || {})} | embeddable ${v.status?.embeddable}`);
  const ch = (await yt('channels', `part=snippet,contentDetails,statistics&id=${v.snippet.channelId}`)).items?.[0];
  L.push(`channel: ${ch?.snippet?.title} | ${ch?.snippet?.country || ''} | subs ${ch?.statistics?.subscriberCount} | videos ${ch?.statistics?.videoCount} | ${String(ch?.snippet?.description || '').slice(0, 300).replace(/\n/g, ' ')}`);
  const up = ch?.contentDetails?.relatedPlaylists?.uploads;
  const items = (await yt('playlistItems', `part=snippet,contentDetails&maxResults=50&playlistId=${up}`)).items || [];
  const ids = items.map(x => x.contentDetails.videoId).join(',');
  const vs = (await yt('videos', `part=snippet,liveStreamingDetails&id=${ids}`)).items || [];
  for (const x of vs) L.push(`  ${x.snippet.publishedAt.slice(0, 10)} | ${x.liveStreamingDetails ? 'LIVE ' + (x.liveStreamingDetails.scheduledStartTime || x.liveStreamingDetails.actualStartTime || '') : 'vod'} | ${x.snippet.title.slice(0, 110)}`);
}
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
