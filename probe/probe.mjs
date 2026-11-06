import { writeFileSync } from 'fs';
const out = [];
try {
  const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
  out.push(`feed ${f.generatedAt} site ${JSON.stringify(f.site || '').slice(0, 60)}`);
  for (const e of f.events.filter(e => /Second XI/.test(e.comp || ''))) out.push(`  2xi ${e.id} | ${e.home} v ${e.away} | ${e.status} | ${(e.yt || []).length} streams`);
  const hl = f.events.filter(e => e.hl);
  out.push(`events with highlights: ${hl.length}; by channel: ${JSON.stringify(hl.reduce((m, e) => (m[e.hl.ch] = (m[e.hl.ch] || 0) + 1, m), {}))}`);
  for (const e of hl.filter(e => /RLWC|DAZN|Rabbit/.test(e.hl.ch))) out.push(`  hl ${e.startUTC.slice(0, 10)} ${e.team} ${String(e.comp).slice(0, 40)} | ${e.home} v ${e.away} -> ${e.hl.url} (${e.hl.ch})`);
  const d = String(f.diag?.youtube || '');
  out.push('yt diag counts: ' + d.split('; matched')[0]);
  out.push('yt diag end: ' + d.slice(d.indexOf('; highlights')));
} catch (err) { out.push('feed error ' + err.message); }
writeFileSync('probe/out.txt', 'feed299\n' + out.join('\n') + '\n');
