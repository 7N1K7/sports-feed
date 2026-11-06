import { writeFileSync } from 'fs';
const key = process.env.YOUTUBE_API_KEY, out = [];
const yt = async (p, q) => { const r = await fetch(`https://www.googleapis.com/youtube/v3/${p}?${q}&key=${key}`); return r.ok ? r.json() : { err: r.status }; };
const line1 = t => String(t || '').split('\n')[0].slice(0, 100);
const v = await yt('videos', 'part=snippet,contentDetails,liveStreamingDetails&id=IZxhbn8-1As,2CW2baagUg8');
const chans = new Set();
for (const x of v.items || []) {
  out.push(`video ${x.id}: ${x.snippet.title} | channel ${x.snippet.channelTitle} ${x.snippet.channelId} | pub ${x.snippet.publishedAt} | state ${x.snippet.liveBroadcastContent} | streamed ${!!x.liveStreamingDetails} | region ${JSON.stringify(x.contentDetails?.regionRestriction || {})} | d: ${line1(x.snippet.description)}`);
  chans.add(x.snippet.channelId);
}
if (v.err) out.push('error ' + v.err);
for (const c of chans) {
  const pl = await yt('playlistItems', `part=contentDetails&maxResults=50&playlistId=UU${c.slice(2)}`);
  const ids = (pl.items || []).map(i => i.contentDetails.videoId);
  const vs = ids.length ? await yt('videos', `part=snippet,liveStreamingDetails&id=${ids.join(',')}`) : { items: [] };
  out.push(`channel ${c}: ${vs.items?.length || 0} uploads`);
  for (const s of vs.items || []) out.push(`  ${s.snippet.publishedAt} ${s.liveStreamingDetails ? 'stream ' + s.snippet.liveBroadcastContent : 'video'} | ${s.snippet.title} || ${line1(s.snippet.description)}`);
}
// the deployed feed: the Second XI games and their streams
try {
  const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
  out.push(`feed ${f.generatedAt}`);
  for (const e of f.events.filter(e => /Second XI/.test(e.comp || ''))) out.push(`  2xi ${e.id} | ${e.comp} ${e.stage || ''} | ${e.home} v ${e.away} | ${e.startUTC} | ${e.status} | ${(e.yt || []).map(y => y.url + ' ' + y.state).join(', ')} | ${e.broadcast} | ${e.watchAU || ''}`);
  out.push('  yt diag tail: ' + String(f.diag?.youtube || '').split('; Second XI')[1]);
} catch (err) { out.push('feed error ' + err.message); }
writeFileSync('probe/out.txt', 'yt296\n' + out.join('\n').replace(/key=[^&\s]+/g, 'key=X') + '\n');
