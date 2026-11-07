import { writeFileSync } from 'fs';
// nc-july-1: why the live feed has no July Nations Championship games; and a rugby YouTube channel the owner suggested (no scores)
const out = [];
const UA = { headers: { 'user-agent': 'kickoff-kiwi-probe/1.0 (https://kickoff.kiwi)' } };
const noSc = s => String(s || '').replace(/\b\d{1,3}\s*[-–—:]\s*\d{1,3}\b/g, '#-#');
try {
  const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
  out.push('feed ' + f.generatedAt + ' v' + f.site?.version);
  out.push('wikipedia: ' + JSON.stringify(Object.fromEntries(Object.entries(f.diag?.wikipedia || {}).filter(([k]) => /Nations|internationals|mid-year/.test(k)))));
  const nc = (f.events || []).filter(e => /Nations Championship/.test(e.comp || ''));
  const by = {}; for (const e of nc) { const k = e.startUTC.slice(0, 7) + ' ' + e.status; by[k] = (by[k] || 0) + 1; }
  out.push('NC events ' + nc.length + ' ' + JSON.stringify(by));
  out.push('NC sources ' + JSON.stringify(nc.reduce((m, e) => (m[(e.source || '').replace(/^.*wiki\//, '')] = (m[(e.source || '').replace(/^.*wiki\//, '')] || 0) + 1, m), {})));
  const jul = (f.events || []).filter(e => e.sport === 'rugby' && /^2026-0[67]/.test(e.startUTC));
  out.push('rugby June/July events in feed: ' + jul.length + ' ' + jul.map(e => `${e.startUTC.slice(0, 10)} ${e.home} v ${e.away} [${e.comp}]`).join('; ').slice(0, 800));
  const tsk = Object.keys(f.diag || {}).filter(k => /tsdb/i.test(k)); out.push('tsdb diag keys ' + tsk.join(','));
  out.push('tsdbBackfill: ' + noSc(JSON.stringify(f.diag?.tsdbBackfill || f.diag?.tsdbBack || '')).slice(0, 600));
} catch (e) { out.push('feed error ' + e.message); }
// the series page as the feed reads it (action=query)
try {
  const t = '2026 Nations Championship Southern Hemisphere Series';
  const j = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(t), UA)).json();
  const pg = j.query?.pages?.[0]; const w = pg?.revisions?.[0]?.slots?.main?.content || '';
  out.push(`${pg?.title} missing=${!!pg?.missing} chars ${w.length} boxes ${(w.match(/\{\{\s*rugby ?box/gi) || []).length}`);
  for (const m of w.matchAll(/\{\{\s*rugby ?box([\s\S]*?)\n\}\}/gi)) { const g = k => ((m[1].match(new RegExp(`\\|\\s*${k}\\s*=\\s*([^\\n]*)`)) || [])[1] || '').trim(); out.push(`  ${g('date')} | ${g('time').slice(0, 40)} | ${g('team1').slice(0, 30)} v ${g('team2').slice(0, 30)} | ${g('stadium').replace(/<ref[\s\S]*/, '').slice(0, 60)}`); }
} catch (e) { out.push('wiki error ' + e.message); }
// YouTube: the suggested channel
const key = process.env.YOUTUBE_API_KEY;
const yt = async (path, q) => { const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${q}&key=${key}`); if (!r.ok) throw new Error(`${path} ${r.status}`); return r.json(); };
for (const ch of ['UCvMgypvk0d5P0K3F3bB19Eg']) {
  try {
    const c = await yt('channels', `part=snippet,statistics,brandingSettings&id=${ch}`); const ci = c.items?.[0];
    out.push(`channel ${ch}: ${ci?.snippet?.title} | ${ci?.snippet?.customUrl || ''} | country ${ci?.snippet?.country || '-'} | subs ${ci?.statistics?.subscriberCount} | videos ${ci?.statistics?.videoCount} | since ${ci?.snippet?.publishedAt}`);
    out.push('  about: ' + String(ci?.snippet?.description || '').replace(/\s+/g, ' ').slice(0, 300));
    const pl = await yt('playlistItems', `part=contentDetails&maxResults=25&playlistId=UU${ch.slice(2)}`);
    const ids = (pl.items || []).map(i => i.contentDetails.videoId);
    if (!ids.length) { out.push('  no uploads'); continue; }
    const vs = await yt('videos', `part=snippet,contentDetails,status&id=${ids.join(',')}`);
    for (const x of vs.items || []) out.push(`  ${x.snippet.publishedAt} | ${noSc(x.snippet.title)} | ${x.snippet.liveBroadcastContent} | ${x.contentDetails.duration} | region ${JSON.stringify(x.contentDetails?.regionRestriction || null)} | embed ${x.status?.embeddable} | desc1 ${noSc(String(x.snippet.description || '').split('\n')[0]).slice(0, 80)}`);
  } catch (e) { out.push('yt error ' + ch + ' ' + e.message.replace(/key=[^&\s]*/g, 'key=X')); }
}
writeFileSync('probe/out.txt', 'nc-july-1\n' + out.join('\n').replace(/key=[^&"\s]*/g, 'key=X') + '\n');
