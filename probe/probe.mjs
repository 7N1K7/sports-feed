// probe 150: the live feed after v434: form, WXV, the tri-series, UFC fight week; NZ domestic cricket pages for form
import { writeFile, readFile } from 'node:fs/promises';
import { wikiEvents } from '../scripts/sources.mjs';
const lines = [];
try {
  const f = await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now()).then(r => r.json()), d = f.diag;
  lines.push(`version ${f.site?.version}, generated ${f.generatedAt}`, 'form: ' + d.form, 'ufcVideos: ' + d.ufcVideos);
  for (const k of Object.keys(d)) if (/^tsdb (backfill|season)|tsdbBackfill|formPrev/.test(k)) lines.push(`${k}: ${JSON.stringify(d[k]).slice(0, 300)}`);
  const wxv = f.events.filter(e => e.team === 'wxv' || (e.tags || []).includes('wxv'));
  lines.push(`WXV games: ${wxv.length}; ${wxv.map(e => `${e.startUTC.slice(5, 16)} ${e.home} v ${e.away} ${e.status}`).join('; ')}`);
  lines.push(`tri-series: ${f.events.filter(e => /tri-series/i.test(e.comp)).map(e => `${e.startUTC.slice(5, 10)} ${e.home} v ${e.away} ${e.status}`).join('; ')}`);
  for (const e of f.events.filter(e => e.buildup)) lines.push(`buildup ${e.comp}: ${e.buildup.map(v => v.k).join(' · ')}`);
  for (const k of ['rugby|All Blacks', 'rugby|Black Ferns|w', 'football|Wellington Phoenix', 'football|Auckland FC', 'football|Arsenal', 'netball|New Zealand|w', 'basketball|New Zealand Breakers', 'cricket|Sydney Sixers|w'])
    lines.push(`${k}: ${(f.form[k] || []).length} · ${(f.form[k] || []).slice(-3).map(x => `${x.d} ${x.r} ${x.o}`).join(', ')}`);
  lines.push(`form ${JSON.stringify(f.form).length} bytes, feed ${JSON.stringify(f).length}`);
} catch (e) { lines.push('error ' + e.message); }
try {
  const cfg = JSON.parse(await readFile('data/wiki-pages.json', 'utf8')).pages.filter(c => c.team === 'nzdomestic'), d = {};
  const ev = await wikiEvents(cfg, () => 'Pacific/Auckland', d, { prevDue: () => true });
  const dom = ev.filter(e => e.team === 'nzdomestic');
  lines.push('domestic pages: ' + Object.entries(d.wikipedia || {}).filter(([k]) => /Plunket|Ford|Smash|Hallyburton/.test(k)).map(([k, v]) => `${k}: ${v}`).join('; '), 'formPrev: ' + d.formPrev);
  lines.push('names: ' + [...new Set(dom.flatMap(e => [e.home, e.away]))].join(', '));
  for (const e of dom.filter(e => e.status === 'final').slice(-4)) lines.push(`  ${e.startUTC.slice(0, 10)} ${e.comp} ${e.home} v ${e.away} | ${e.summary || e.score}`);
} catch (e) { lines.push('domestic error ' + e.message); }
await writeFile(new URL('./out.txt', import.meta.url), lines.join('\n') + '\n');
