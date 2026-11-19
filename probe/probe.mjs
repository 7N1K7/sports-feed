// daily check, 20 Nov, after v803: the Plunket Shield rounds and the netball game on the live feed. No results printed.
import { writeFileSync } from 'node:fs';
const out = []; process.on('exit', () => writeFileSync('probe/out.txt', out.join('\n') + '\n'));
try {
  const f = await (await fetch('https://kickoff.kiwi/data/feed.json?t=' + Date.now())).json(); const now = Date.now();
  out.push(`feed built ${f.generatedAt} (${Math.round((now - Date.parse(f.generatedAt)) / 6e4)} min ago) | site ${f.site?.version} | games ${f.events.length}`);
  const ps = f.events.filter(e => /Plunket/.test(e.comp)).sort((a, b) => a.startUTC.localeCompare(b.startUTC));
  out.push(`Plunket Shield games ${ps.length}`); for (const e of ps) out.push(`  ${e.id} | ${e.startUTC} | ${e.comp} | ${e.home} v ${e.away} | ${e.venue}, ${e.city} | ${e.status} | watch: ${e.broadcast || ''}`);
  for (const e of f.events.filter(e => /^wmseries/.test(e.id))) out.push(`netball | ${e.id} | ${e.status} | has result ${!!e.score} | ${e.source}`);
  out.push('thinWeeks: ' + JSON.stringify(f.checks?.thinWeeks));
} catch (e) { out.push('probe error: ' + String(e.stack || e).slice(0, 400)); }
