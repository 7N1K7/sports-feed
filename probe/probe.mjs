import { writeFileSync } from 'fs';
const out = [];
try {
  const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
  out.push(`feed ${f.generatedAt} site ${JSON.stringify(f.site || '').slice(0, 60)}`);
  for (const e of f.events.filter(e => /Second XI/.test(e.comp || ''))) out.push(`  2xi ${e.id} | ${e.comp} ${e.stage || ''} | ${e.home} v ${e.away} | ${e.startUTC} | ${e.status} | ${(e.yt || []).map(y => y.url + ' ' + y.state).join(', ')} | bc "${e.broadcast}" | au ${e.watchAU || ''}`);
  const hl = f.events.filter(e => e.hl);
  out.push(`events with highlights: ${hl.length}`);
  for (const e of hl.slice(0, 40)) out.push(`  hl ${e.startUTC.slice(0, 10)} ${e.team} ${e.home} v ${e.away} -> ${e.hl.url} (${e.hl.ch})`);
  const d = String(f.diag?.youtube || '');
  out.push('yt diag: ' + d.replace(/matched \d+:.*?; highlights/, 'matched ...; highlights'));
} catch (err) { out.push('feed error ' + err.message); }
writeFileSync('probe/out.txt', 'feed297\n' + out.join('\n').replace(/key=[^&\s]+/g, 'key=X') + '\n');
