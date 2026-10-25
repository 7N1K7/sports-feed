// probe 208: which YouTube channels stream the Pakistan v England tri-series games, and are they open in NZ? Channel
// names, ids, sizes and countries; each stream's title, state and region limits. The key isn't printed
import fs from 'fs';
const key = process.env.YOUTUBE_API_KEY, L = [];
const yt = async (path, q) => { const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${q}&key=${key}`); return r.ok ? r.json() : { error: r.status }; };
const vids = new Map(), chans = new Set();
for (const q of ['Pakistan vs England live', 'PAK vs ENG ODI tri series live', 'Pakistan v England tri-series highlights', 'sportstv cricket live']) {
  for (const ev of ['live', 'completed', 'upcoming']) {
    const r = await yt('search', `part=snippet&type=video&eventType=${ev}&maxResults=15&q=${encodeURIComponent(q)}`);
    for (const it of r.items || []) { vids.set(it.id.videoId, it.snippet); chans.add(it.snippet.channelId); }
  }
}
const cs = await yt('search', `part=snippet&type=channel&maxResults=10&q=${encodeURIComponent('sports tv')}`);
for (const it of cs.items || []) chans.add(it.snippet.channelId);
const ids = [...vids.keys()];
const det = ids.length ? await yt('videos', `part=snippet,contentDetails,liveStreamingDetails,status&id=${ids.slice(0, 50).join(',')}`) : { items: [] };
const cinfo = new Map();
for (let i = 0; i < [...chans].length; i += 50) { const r = await yt('channels', `part=snippet,statistics&id=${[...chans].slice(i, i + 50).join(',')}`); for (const c of r.items || []) cinfo.set(c.id, c); }
const cl = c => c ? `${c.snippet.title} [${c.snippet.customUrl || ''}] ${c.id} subs ${c.statistics.subscriberCount} country ${c.snippet.country || '?'}` : '?';
L.push('== streams (only those with Pakistan or England in the title)');
for (const v of det.items || []) {
  if (!/pak|eng/i.test(v.snippet.title)) continue;
  const rr = v.contentDetails.regionRestriction;
  L.push(`${v.snippet.liveBroadcastContent} | ${v.snippet.title.slice(0, 110)} | ${cl(cinfo.get(v.snippet.channelId))} | licensed ${v.contentDetails.licensedContent} | NZ ${rr ? (rr.allowed ? (rr.allowed.includes('NZ') ? 'allowed (list)' : 'not in allowed list') : rr.blocked?.includes('NZ') ? 'BLOCKED' : 'open') : 'open'} | start ${v.liveStreamingDetails?.actualStartTime || v.liveStreamingDetails?.scheduledStartTime || ''} | https://youtu.be/${v.id}`);
}
L.push('\n== channels named like "sports tv"');
for (const it of cs.items || []) { const c = cinfo.get(it.snippet.channelId); L.push(cl(c) + ' | ' + (c?.snippet.description || '').replace(/\s+/g, ' ').slice(0, 200)); }
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
