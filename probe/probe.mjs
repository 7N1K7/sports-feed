// daily check, 21 Nov: the UFC card of Sun 22 Nov on the live feed and why its Duke listing counts as unmatched; national football on the site. No results printed.
import { writeFileSync } from 'node:fs';
const out = []; process.on('exit', () => writeFileSync('probe/out.txt', out.join('\n') + '\n'));
try {
  const f = await (await fetch('https://kickoff.kiwi/data/feed.json?t=' + Date.now())).json(); const now = Date.now();
  out.push(`feed built ${f.generatedAt} | site ${f.site?.version}`);
  for (const e of f.events.filter(e => e.sport === 'mma' && Math.abs(Date.parse(e.startUTC) - now) < 6 * 864e5))
    out.push(JSON.stringify({ id: e.id, team: e.team, comp: e.comp, home: e.home, away: e.away, startUTC: e.startUTC, timeTBC: e.timeTBC, status: e.status, broadcast: e.broadcast, tv: (e.tv || []).map(t => `${t.at} ${t.ch}`), open: e.openUTC, card: (e.card || e.fights || []).length, source: e.source }).slice(0, 700));
  out.push('diag keys: ' + Object.keys(f.diag || {}).filter(k => /tv|guide|ufc|mma/i.test(k)).map(k => `${k}: ${String(JSON.stringify(f.diag[k])).slice(0, 260)}`).join(' || '));
  for (const e of f.events.filter(e => /^(footballferns|allwhites)$/.test(e.team) && Date.parse(e.startUTC) > now - 10 * 864e5)) out.push(`football | ${e.id} | ${e.team} | ${e.comp} | ${e.home} v ${e.away} | ${e.startUTC} | ${e.status} | ${e.source}`);
} catch (e) { out.push('probe error: ' + String(e.stack || e).slice(0, 400)); }
