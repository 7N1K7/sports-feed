import { writeFileSync } from 'node:fs';
const out = [];
process.on('exit', () => writeFileSync(new URL('./out.txt', import.meta.url), out.join('\n') + '\n'));
try {
  const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
  out.push('feed ' + f.generatedAt + ' v' + f.site?.version);
  for (const x of f.events.filter(x => x.team === 'ufc' && Date.parse(x.startUTC) > Date.now() - 2 * 864e5).slice(0, 3))
    out.push(JSON.stringify({ id: x.id, home: x.home, away: x.away, comp: x.comp, s: x.startUTC, tbc: x.timeTBC, tz: x.tz, tv: x.tv, broadcast: x.broadcast, watchNote: x.watchNote, src: x.source, card: (x.card || []).length, keys: Object.keys(x) }));
  const c = await (await fetch('https://kickoff.kiwi/data/coverage-detail.json?' + Date.now())).json();
  for (const g of (c.tvGaps?.nz || [])) out.push('gap ' + JSON.stringify(g));
  out.push('checks ' + JSON.stringify(f.checks || c.checks || {}).slice(0, 1500));
} catch (e) { out.push('feed err ' + e.message); }
try {
  const r = await fetch('https://i.mjh.nz/nz/epg.xml');
  const x = await r.text();
  const progs = x.split('<programme ').slice(1);
  for (const p of progs) {
    if (!/ufc|football ferns|philippines/i.test(p)) continue;
    const g = k => (p.match(new RegExp('<' + k + '[^>]*>([^<]*)'))?.[1] || '');
    out.push(['epg', p.match(/start="([^"]+)"/)?.[1], p.match(/stop="([^"]+)"/)?.[1], p.match(/channel="([^"]+)"/)?.[1], g('title'), g('sub-title'), g('desc').slice(0, 260)].join(' | '));
  }
} catch (e) { out.push('epg err ' + e.message); }
