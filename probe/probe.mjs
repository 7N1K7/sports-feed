import { writeFileSync } from 'fs';
const key = process.env.YOUTUBE_API_KEY, out = [];
const yt = async (p, q) => { const r = await fetch(`https://www.googleapis.com/youtube/v3/${p}?${q}&key=${key}`); return r.ok ? r.json() : { err: r.status }; };
const line1 = t => String(t || '').split('\n')[0].slice(0, 90);
const ids = [];
for (const h of ['rlwc2026', 'DAZNBoxing']) {
  const c = await yt('channels', `part=snippet&forHandle=${h}`);
  const it = (c.items || [])[0];
  out.push(`handle ${h}: ${it ? it.id + ' ' + it.snippet.title : 'not found ' + JSON.stringify(c.err || c.pageInfo || {})}`);
  if (it) ids.push(it.id);
}
ids.push('UCSZ21xyG8w_33KriMM69IxQ');
for (const c of ids) {
  const ch = await yt('channels', `part=snippet&id=${c}`);
  const pl = await yt('playlistItems', `part=contentDetails&maxResults=50&playlistId=UU${c.slice(2)}`);
  const vids = (pl.items || []).map(i => i.contentDetails.videoId);
  const vs = vids.length ? await yt('videos', `part=snippet,contentDetails,liveStreamingDetails&id=${vids.join(',')}`) : { items: [] };
  out.push(`channel ${c} ${(ch.items || [])[0]?.snippet?.title || '?'}: ${vs.items?.length || 0} uploads`);
  for (const s of (vs.items || []).slice(0, 30)) { const r = s.contentDetails?.regionRestriction; const nz = !r ? '' : r.allowed ? (r.allowed.includes('NZ') ? '' : ' NZ-shut') : r.blocked?.includes('NZ') ? ' NZ-shut' : '';
    out.push(`  ${s.snippet.publishedAt} ${s.liveStreamingDetails ? 'stream ' + s.snippet.liveBroadcastContent + ' ' + (s.liveStreamingDetails.actualStartTime || s.liveStreamingDetails.scheduledStartTime || '') : 'video'}${nz} | ${s.snippet.title} || ${line1(s.snippet.description)}`); }
}
writeFileSync('probe/out.txt', 'ch298\n' + out.join('\n').replace(/key=[^&\s]+/g, 'key=X') + '\n');
