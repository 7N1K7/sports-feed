import { writeFileSync } from 'fs';
// nc-july-2: the live feed's Nations Championship games by month and status, and the July games (no scores)
const out = [];
try {
  const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
  out.push('feed ' + f.generatedAt + ' v' + f.site?.version);
  out.push('wikipedia: ' + JSON.stringify(Object.fromEntries(Object.entries(f.diag?.wikipedia || {}).filter(([k]) => /Nations Championship/.test(k)))));
  out.push('youtube: ' + String(f.diag?.youtube || '').match(/SANZAAR TV[^,;]*/)?.[0] + ' | ' + String(f.diag?.youtube || '').match(/highlights videos on \d+ games/)?.[0]);
  const nc = (f.events || []).filter(e => /Nations Championship/.test(e.comp || '')).sort((a, b) => a.startUTC.localeCompare(b.startUTC));
  const by = {}; for (const e of nc) { const k = e.startUTC.slice(0, 7) + ' ' + e.status; by[k] = (by[k] || 0) + 1; }
  out.push('NC events ' + nc.length + ' ' + JSON.stringify(by));
  for (const e of nc.filter(e => /^2026-07/.test(e.startUTC))) out.push(`  ${e.startUTC}${e.timeTBC ? ' TBC' : ''} | ${e.home} v ${e.away} | ${e.venue}, ${e.city} | ${e.status} | has result ${!!e.score} | ${e.team} | ${e.id}`);
  const ids = nc.map(e => e.id); out.push('duplicate ids ' + (ids.length - new Set(ids).size));
  const hl = (f.events || []).filter(e => e.hl?.ch === 'SANZAAR TV').map(e => `${e.startUTC.slice(0, 10)} ${e.home} v ${e.away}`); out.push('SANZAAR highlights on: ' + (hl.join('; ') || 'none'));
} catch (e) { out.push('feed error ' + e.message); }
writeFileSync('probe/out.txt', 'nc-july-2\n' + out.join('\n').replace(/key=[^&"\s]*/g, 'key=X') + '\n');
