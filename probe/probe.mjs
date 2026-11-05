import { writeFileSync } from 'fs';
const out = [], key = process.env.YOUTUBE_API_KEY;
const yt = async (p, q) => { const r = await fetch(`https://www.googleapis.com/youtube/v3/${p}?${q}&key=${key}`); if (!r.ok) return { err: r.status }; return r.json(); };
const page = await (await fetch('https://www.youtube.com/RabbitholebdSports', { headers: { 'accept-language': 'en' } })).text().catch(e => '');
const pid = (page.match(/"channelId":"(UC[\w-]{22})"/) || page.match(/channel\/(UC[\w-]{22})/) || [])[1];
out.push('page channelId: ' + pid);
for (const q of [pid && `id=${pid}`, 'forUsername=RabbitholebdSports', 'forHandle=rabbitholebd', 'id=UC2t9imwIR7xlDfma3CmRKJQ'].filter(Boolean)) {
  const ch = await yt('channels', 'part=id,snippet&' + q); const c = ch.items?.[0];
  out.push(`${q}: ` + (c ? `${c.id} | ${c.snippet.title} | ${c.snippet.customUrl || ''} | ${c.snippet.country || ''} | ${c.snippet.description.slice(0, 160).replace(/\n/g, ' ')}` : 'none'));
  if (!c) continue;
  const pl = await yt('playlistItems', `part=contentDetails&maxResults=50&playlistId=UU${c.id.slice(2)}`);
  const ids = (pl.items || []).map(x => x.contentDetails.videoId);
  const v = ids.length ? await yt('videos', `part=snippet,contentDetails,liveStreamingDetails&id=${ids.join(',')}`) : {};
  for (const x of (v.items || []).filter(x => x.liveStreamingDetails).slice(0, 8)) out.push(`  ${x.snippet.liveBroadcastContent} ${x.liveStreamingDetails.actualStartTime || x.liveStreamingDetails.scheduledStartTime} | ${x.snippet.title.slice(0, 90)} | region ${JSON.stringify(x.contentDetails.regionRestriction || {})}`);
}
writeFileSync('probe/out.txt', out.join('\n') + '\n');
// 278
