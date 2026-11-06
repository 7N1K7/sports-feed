import { writeFileSync } from 'fs';
const out = [];
const UA = { headers: { 'user-agent': 'kickoff-kiwi-probe/1.0 (https://kickoff.kiwi)' } };
const key = process.env.YOUTUBE_API_KEY;
const yt = async (path, q) => { const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${q}&key=${key}`); if (!r.ok) throw new Error(`${path} ${r.status}`); return r.json(); };
// 1. the series' own Wikipedia pages, as wikitext
for (const [t, f] of [['2026 Nations Championship Northern Hemisphere Series', 'nh'], ['2026 Nations Championship Southern Hemisphere Series', 'sh'], ['2026 Nations Championship Finals', 'fin']]) {
  try {
    const j = await (await fetch('https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&redirects=1&page=' + encodeURIComponent(t), UA)).json();
    const w = j.parse?.wikitext || ''; writeFileSync(`probe/out-nc-${f}.txt`, w);
    out.push(`${t}: ${w.length} chars, rugbybox ${(w.match(/\{\{\s*rugby ?box/gi) || []).length}${j.error ? ' error ' + j.error.info : ''}`);
  } catch (e) { out.push(t + ' error ' + e.message); }
}
// 2. the Nations Championship's YouTube channel: its latest uploads (streams, highlights)
for (const ch of ['UCMDN3VEKhM1LIJTDtGd7_Hw', 'UCBcHtMmG1n2V6CB4SWPsMUA']) {
  try {
    const c = await yt('channels', `part=snippet,statistics&id=${ch}`); const ci = c.items?.[0];
    out.push(`channel ${ch}: ${ci?.snippet?.title} | subs ${ci?.statistics?.subscriberCount} | videos ${ci?.statistics?.videoCount} | ${ci?.snippet?.country || ''}`);
    const pl = await yt('playlistItems', `part=contentDetails&maxResults=30&playlistId=UU${ch.slice(2)}`);
    const ids = (pl.items || []).map(i => i.contentDetails.videoId);
    if (!ids.length) continue;
    const vs = await yt('videos', `part=snippet,contentDetails,liveStreamingDetails,status&id=${ids.join(',')}`);
    for (const x of vs.items || []) out.push(`  ${x.snippet.publishedAt} | ${x.snippet.title} | ${x.snippet.liveBroadcastContent} | ${x.contentDetails.duration} | region ${JSON.stringify(x.contentDetails?.regionRestriction || null)} | embed ${x.status?.embeddable}`);
  } catch (e) { out.push('yt error ' + ch + ' ' + e.message); }
}
// 3. news feeds: stories naming the Nations Championship
for (const u of ['https://feeds.bbci.co.uk/sport/rugby-union/rss.xml', 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/sport/rugby/?outputType=xml&_website=nzh', 'https://www.rnz.co.nz/rss/sport.xml']) {
  try {
    const x = await (await fetch(u, UA)).text(); const items = [...x.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1]);
    const t = items.map(i => (i.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '').map(s => s.replace(/<!\[CDATA\[|\]\]>/g, ''));
    const d = items.map(i => (i.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '');
    out.push(`${u.split('/')[2]}: ${items.length} items; NC: ${t.filter((s, i) => /Nations Championship/i.test(s + d[i])).length}`);
    t.forEach((s, i) => { if (/Nations Championship|Ireland|Argentina|Scotland|Wales|England|France|Italy|Springboks|South Africa|Fiji|Japan|Wallabies/i.test(s)) out.push('   ' + s.slice(0, 140)); });
  } catch (e) { out.push(u + ' error ' + e.message); }
}
writeFileSync('probe/out.txt', 'nc305\n' + out.join('\n').replace(/key=[^&"\s]*/g, 'key=X') + '\n');
