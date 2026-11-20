// weekend check, Fri 20 Nov: the live feed's age and what it has from Friday evening to Monday morning NZ time. No results printed.
import { writeFileSync } from 'node:fs';
const out = []; process.on('exit', () => writeFileSync('probe/out.txt', out.join('\n') + '\n'));
try {
  const f = await (await fetch('https://kickoff.kiwi/data/feed.json?t=' + Date.now())).json(); const now = Date.now();
  out.push(`feed built ${f.generatedAt} (${Math.round((now - Date.parse(f.generatedAt)) / 6e4)} min ago) | site ${f.site?.version} | games ${f.events.length} | no sport ${f.events.filter(e => !e.sport).length}`);
  out.push('checks: ' + (f.diag?.checks || '') + ' | thinWeeks ' + JSON.stringify(f.checks?.thinWeeks));
  for (const x of f.checks?.noResult || []) if (Date.parse(x.at) > now - 3 * 864e5) out.push(`noResult | ${x.c} | ${x.n} | ${x.at}`);
  const nz = d => new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(d));
  const from = Date.parse('2026-11-20T04:00:00Z'), to = Date.parse('2026-11-22T20:00:00Z');
  const wk = f.events.filter(e => { const t = Date.parse(e.startUTC); return t >= from && t < to; }).sort((a, b) => a.startUTC.localeCompare(b.startUTC));
  out.push(`games from Fri 5pm to Mon 9am NZ: ${wk.length}; time to be confirmed: ${wk.filter(e => e.timeTBC).length}; no where-to-watch: ${wk.filter(e => !e.broadcast && !(e.tv || []).length).length}`);
  const by = {}; for (const e of wk) by[e.sport] = (by[e.sport] || 0) + 1; out.push('by sport: ' + JSON.stringify(by));
  const NZT = /New Zealand|All Blacks|Black Caps|Black Sticks|Silver Ferns|Phoenix|Auckland FC|Breakers|Warriors|Kāhu|Whai|Queens|Pouākai|Hoiho|Volts|Aces|Stags|Firebirds|Canterbury|Northern (Districts|Brave)/;
  for (const e of wk) if (NZT.test(e.home + ' ' + e.away) || /^(blackcaps|allblacks|blacksticks|silverferns|tauihi|phoenix|phoenixw|aucklandfc|breakers|ufc|nzboxing|f1|supercars)$/.test(e.team))
    out.push(`${nz(e.startUTC)} | ${e.sport} | ${String(e.comp).slice(0, 44)} | ${e.home}${e.away ? ' v ' + e.away : ''} | ${e.status}${e.timeTBC ? ' | TIME TBC' : ''} | watch: ${String(e.broadcast || '').slice(0, 40)} | tv: ${(e.tv || []).map(t => nz(t.at) + ' ' + (t.ch || '')).slice(0, 2).join('; ') || 'none'}`);
} catch (e) { out.push('probe error: ' + String(e.stack || e).slice(0, 400)); }
