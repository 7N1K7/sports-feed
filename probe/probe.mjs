// probe 148: UFC's latest YouTube uploads (the key's length only, never the key); which box templates the 2026 Nations
// Championship page uses; the titles of 2025's rugby internationals pages and this year's Farah Palmer Cup; the WXV page
// read with the new "every game" rule
import { writeFile } from 'node:fs/promises';
import { wikiEvents } from '../scripts/sources.mjs';
const lines = [], UA = { headers: { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' } };
const key = process.env.YOUTUBE_API_KEY || '';
lines.push(`key length ${key.length}`);
const yt = async (path, q) => { const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${q}&key=${key}`); if (!r.ok) throw new Error(`${path} ${r.status}`); return r.json(); };
try {
  const ch = await yt('channels', 'part=snippet&id=UCvgfXK4nTYKudb0rFR6noLA');
  lines.push(`channel: ${ch.items?.[0]?.snippet?.title}`);
  const ids = ((await yt('playlistItems', 'part=contentDetails&maxResults=50&playlistId=UUvgfXK4nTYKudb0rFR6noLA')).items || []).map(x => x.contentDetails.videoId);
  for (const x of (await yt('videos', `part=snippet,liveStreamingDetails&id=${ids.join(',')}`)).items || []) { const ls = x.liveStreamingDetails || {}; lines.push(`  ${x.snippet.publishedAt.slice(0, 16)} ${x.snippet.liveBroadcastContent.padEnd(8)} ${ls.scheduledStartTime ? 'sched ' + ls.scheduledStartTime.slice(0, 16) : ''} ${x.snippet.title}`); }
} catch (e) { lines.push('youtube error ' + e.message); }
const wp = q => fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&' + q, UA).then(r => r.json());
try {
  const t = (await wp('action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=2026_Nations_Championship')).query.pages[0].revisions[0].slots.main.content;
  const c = {}; for (const m of t.matchAll(/\{\{\s*([^|}\n]+?)\s*[|\n]/g)) if (/box|match|fixture|result/i.test(m[1])) c[m[1]] = (c[m[1]] || 0) + 1;
  lines.push('Nations Championship templates: ' + JSON.stringify(c), 'length ' + t.length);
  const i = t.search(/\{\{\s*[Rr]ugby ?box/); lines.push('first box: ' + JSON.stringify(t.slice(i, i + 500)));
} catch (e) { lines.push('nc error ' + e.message); }
for (const q of ['2025 end-of-year rugby union', '2025 mid-year rugby union', '2025 July rugby union', '2025 rugby union internationals', '2026 Farah Palmer Cup', '2025 Farah Palmer Cup', "2025 women's rugby union", '2025–26 Plunket Shield', '2025–26 Ford Trophy', '2025–26 Super Smash'])
  try { const r = await wp('action=opensearch&limit=6&namespace=0&search=' + encodeURIComponent(q)); lines.push(`${q}: ${JSON.stringify(r[1])}`); } catch (e) { lines.push(q + ' error'); }
try {
  const d = {}, ev = await wikiEvents([{ title: '{Y} WXV Global Series', sport: 'rugby', comp: 'WXV Global Series', classify: 'wxv', women: true }], () => 'Europe/London', d, { prevDue: () => false });
  lines.push(`WXV: ${ev.filter(e => e.comp === 'WXV Global Series').length} games`);
  for (const e of ev.filter(e => e.comp === 'WXV Global Series')) lines.push(`  ${e.startUTC} ${e.team} ${e.home} v ${e.away} ${e.status} ${e.score || ''} ${e.stage || ''} ${e.venue || ''}`);
} catch (e) { lines.push('wxv error ' + e.message); }
await writeFile(new URL('./out.txt', import.meta.url), lines.join('\n') + '\n');
