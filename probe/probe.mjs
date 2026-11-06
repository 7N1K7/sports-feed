import { writeFileSync } from 'fs';
const out = [];
const key = process.env.YOUTUBE_API_KEY;
const yt = async (path, q) => { const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${q}&key=${key}`); if (!r.ok) throw new Error(`${path} ${r.status} ${(await r.text()).slice(0, 200)}`); return r.json(); };
const vinfo = x => `${x.id} | ${x.snippet.channelTitle} (${x.snippet.channelId}) | ${x.snippet.title} | ${x.snippet.liveBroadcastContent} | sched ${x.liveStreamingDetails?.scheduledStartTime || '-'} | actual ${x.liveStreamingDetails?.actualStartTime || '-'} | region ${JSON.stringify(x.contentDetails?.regionRestriction || null)} | embeddable ${x.status?.embeddable}`;
// 1. the Gallen prelims video the user sent, and its channel's other streams
try {
  const v = await yt('videos', 'part=snippet,contentDetails,liveStreamingDetails,status&id=3ebBxHb4PN4');
  const x = v.items?.[0]; out.push('video: ' + (x ? vinfo(x) : 'none'));
  if (x) {
    out.push('desc line1: ' + String(x.snippet.description || '').split('\n').slice(0, 4).join(' / ').slice(0, 300));
    const ch = x.snippet.channelId;
    const pl = await yt('playlistItems', `part=contentDetails&maxResults=50&playlistId=UU${ch.slice(2)}`);
    const ids = (pl.items || []).map(i => i.contentDetails.videoId);
    const vs = await yt('videos', `part=snippet,contentDetails,liveStreamingDetails,status&id=${ids.join(',')}`);
    out.push(`channel uploads ${ids.length}; streams:`);
    for (const s of (vs.items || []).filter(i => i.liveStreamingDetails)) out.push('  ' + vinfo(s));
  }
} catch (e) { out.push('yt error ' + e.message); }
// 2. YouTube channels for the Nations Championship
try {
  const s = await yt('search', 'part=snippet&type=channel&maxResults=8&q=' + encodeURIComponent('Nations Championship rugby'));
  for (const i of s.items || []) out.push(`channel: ${i.snippet.channelTitle} | ${i.id.channelId} | ${String(i.snippet.description).slice(0, 120)}`);
} catch (e) { out.push('yt search error ' + e.message); }
try {
  const s = await yt('search', 'part=snippet&type=video&maxResults=15&order=date&q=' + encodeURIComponent('Nations Championship highlights rugby'));
  for (const i of s.items || []) out.push(`video: ${i.snippet.publishedAt} | ${i.snippet.channelTitle} | ${i.snippet.channelId} | ${i.snippet.title}`);
} catch (e) { out.push('yt search2 error ' + e.message); }
writeFileSync('probe/out.txt', 'gal304\n' + out.join('\n').replace(/key=[^&"\s]*/g, 'key=X') + '\n');
