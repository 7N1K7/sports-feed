// probe 184: the F1 timing log, the Wikipedia article's edit history, and TheSportsDB's round 18 as it stands
import fs from 'fs';
const ua = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi) probe' }, L = [];
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
L.push('feed generated: ' + (f.generated || f.updated || f.diag?.generated || '?'));
L.push('diag.f1Sessions: ' + JSON.stringify(f.diag?.f1Sessions));
L.push('diag.f1SessionsSeen: ' + JSON.stringify(f.diag?.f1SessionsSeen));
const h = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=timestamp|size|comment&rvlimit=60&titles=' + encodeURIComponent('2026 United States Grand Prix'), { headers: ua })).json();
L.push('wiki edits (newest first):');
for (const r of h.query?.pages?.[0]?.revisions || []) L.push(`  ${r.timestamp} ${r.size} ${String(r.comment || '').slice(0, 90)}`);
const t = await (await fetch('https://www.thesportsdb.com/api/v1/json/123/eventsround.php?id=4370&r=18&s=2026', { headers: ua })).json();
for (const e of t.events || []) L.push(`tsdb: ${e.strEvent} ${e.dateEvent} ${e.strTime} lines=${String(e.strResult || '').split('\n').filter(x => /^\s*\d+\.\s/.test(x)).length} ${JSON.stringify(String(e.strResult || '').slice(0, 100))}`);
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
