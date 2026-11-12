// 13 Nov: Wikipedia's full FIFA ranking data modules (for depth past the top 20)
import { writeFileSync } from 'fs';
const out = [], UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
for (const t of ['Module:SportsRankings/data/FIFA World Rankings', "Module:SportsRankings/data/FIFA Women's World Rankings", 'Module:SportsRankings/data/World Rugby Rankings']) {
  try { const r = await fetch(`https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(t.replace(/ /g, '_'))}&action=raw`, { headers: UA }); const s = await r.text();
    out.push(`== ${t} ${r.status} ${s.length} chars, ${s.split('\n').length} lines`, s.slice(0, 1400), '...', s.split('\n').filter(l => /New Zealand|India|Fiji|Solomon/.test(l)).join('\n')); } catch (e) { out.push(t + ' err ' + e.message); }
}
writeFileSync('probe/out-fifamod.txt', out.join('\n') + '\n');
