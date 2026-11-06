import { writeFileSync } from 'fs';
const out = [];
// 1. the live feed's Gallen card: its streams (no scores)
try {
  const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
  out.push('feed ' + f.generatedAt + ' v' + f.site?.version);
  const g = (f.events || []).find(e => /gallen/.test(e.id)); out.push('gallen yt: ' + JSON.stringify(g?.yt || null));
  out.push('yt diag: ' + String(f.diag?.youtube || '').slice(0, 900));
} catch (e) { out.push('feed error ' + e.message); }
// 2. Sky's guide: what it lists for this week's Nations Championship games
for (const u of ['https://i.mjh.nz/SkySportNow/epg.xml', 'https://i.mjh.nz/SkyGo/epg.xml']) {
  try {
    const x = await (await fetch(u)).text();
    const chans = Object.fromEntries([...x.matchAll(/<channel id="([^"]+)">[\s\S]*?<display-name[^>]*>([^<]+)</g)].map(m => [m[1], m[2]]));
    const progs = [...x.matchAll(/<programme start="(\d{12})[^"]*" stop="[^"]*" channel="([^"]+)"[^>]*>\s*<title[^>]*>([^<]+)<\/title>(?:\s*<desc[^>]*>([^<]*)<\/desc>)?/g)];
    out.push(`${u}: ${x.length} bytes, ${progs.length} programmes`);
    for (const m of progs) if (/Ireland v Argentina|Italy v South Africa|Wales v Japan|France v Fiji|England v Australia|Scotland v (New Zealand|All Blacks)|Nations Championship/i.test(m[3] + ' ' + (m[4] || ''))) out.push(`  ${m[1]} | ${chans[m[2]] || m[2]} | ${m[3]} | ${(m[4] || '').slice(0, 90)}`);
  } catch (e) { out.push(u + ' error ' + e.message); }
}
writeFileSync('probe/out.txt', 'nc306\n' + out.join('\n').replace(/key=[^&"\s]*/g, 'key=X') + '\n');
