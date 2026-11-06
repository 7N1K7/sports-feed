import { writeFileSync } from 'fs';
const out = [];
try {
  const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
  out.push('feed ' + f.generatedAt + ' v' + f.site?.version);
  const nc = (f.events || []).filter(e => /Nations Championship/.test(e.comp || '')).sort((a, b) => a.startUTC.localeCompare(b.startUTC));
  out.push(`NC events ${nc.length}; upcoming ${nc.filter(e => e.status !== 'final').length}; by team ${JSON.stringify(nc.reduce((m, e) => (m[e.team] = (m[e.team] || 0) + 1, m), {}))}`);
  // the games still to come (no scores)
  for (const e of nc.filter(e => e.status !== 'final')) out.push(`  ${e.startUTC}${e.timeTBC ? ' TBC' : ''} | ${e.home} v ${e.away} | ${e.stage || ''} | ${e.team} ${JSON.stringify(e.tags || [])} | ${e.venue}, ${e.city} | ${e.broadcast || ''} | tv ${(e.tv || []).map(x => x.ch).join('/')} | id ${e.id}`);
  out.push('wikipedia: ' + JSON.stringify(Object.fromEntries(Object.entries(f.diag?.wikipedia || {}).filter(([k]) => /Nations/.test(k)))));
  out.push('yt: ' + String(f.diag?.youtube || '').match(/Nations Championship[^,;]*/)?.[0]);
  const news = (f.news || []).filter(n => n.team === 'nations');
  out.push(`news tagged nations ${news.length}: ` + news.map(n => `${n.source}: ${n.title.replace(/\d+\s*[-–]\s*\d+/g, '#')}`).join(' | ').slice(0, 1500));
  out.push('tables: ' + (f.tables || []).filter(t => /Nations/.test(t.comp)).map(t => `${t.title} ${t.rows.length}`).join(', '));
} catch (e) { out.push('feed error ' + e.message); }
writeFileSync('probe/out.txt', 'nc308\n' + out.join('\n').replace(/key=[^&"\s]*/g, 'key=X') + '\n');
