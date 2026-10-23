// probe 149: a full feed build with form, fight week, every WXV game and tri-series; what came out
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, stat } from 'node:fs/promises';
const lines = [], t0 = Date.now();
const run = spawnSync('node', ['scripts/fetch.mjs'], { encoding: 'utf8', timeout: 25 * 60e3, maxBuffer: 64e6 });
lines.push(`fetch exit ${run.status} in ${Math.round((Date.now() - t0) / 1000)} s`);
for (const l of (run.stderr || '').split('\n').filter(l => /Error|at file|\.mjs:\d+/.test(l)).slice(0, 15)) lines.push('  ' + l.slice(0, 200));
try {
  const f = JSON.parse(await readFile('data/feed.json', 'utf8')), d = f.diag;
  lines.push('form: ' + d.form, 'formPrev: ' + d.formPrev, 'ufcVideos: ' + d.ufcVideos, 'youtube: ' + String(d.youtube).slice(0, 200));
  for (const k of Object.keys(d)) if (/^tsdb (backfill|season)|tsdbBackfill/.test(k)) lines.push(`${k}: ${JSON.stringify(d[k])}`);
  lines.push('tri pages: ' + Object.entries(d.wikipedia || {}).filter(([k]) => /tri|triangular/i.test(k)).map(([k, v]) => `${k}: ${v}`).join('; '));
  for (const e of f.events.filter(e => e.buildup)) lines.push(`buildup ${e.comp} ${e.home} v ${e.away}: ${e.buildup.map(v => `${v.k} (${v.at.slice(5, 16)}${v.state ? ' ' + v.state : ''})`).join(' · ')}`);
  const wxv = f.events.filter(e => e.comp === 'WXV Global Series');
  lines.push(`WXV in feed: ${wxv.length} (${wxv.filter(e => e.team === 'wxv').length} wxv), e.g. ${wxv.filter(e => e.team === 'wxv').slice(-3).map(e => `${e.startUTC.slice(0, 16)} ${e.home} v ${e.away} ${e.broadcast || ''}`).join('; ')}`);
  const tri = f.events.filter(e => /tri|triangular/i.test(e.comp));
  lines.push(`tri-series in feed: ${tri.length}`); for (const e of tri.slice(0, 12)) lines.push(`  ${e.startUTC.slice(0, 16)} ${e.team} ${e.comp} | ${e.stage || ''} | ${e.home} v ${e.away} ${e.status} ${e.score || ''} ${e.broadcast || ''}`);
  lines.push('tri tables: ' + (f.tables || []).filter(t => /tri/i.test(t.comp + ' ' + t.page)).map(t => `${t.comp} / ${t.title}: ${t.rows.length}`).join('; '));
  lines.push(`form ${JSON.stringify(f.form).length} bytes, feed ${JSON.stringify(f).length}, results.json ${(await stat('.cache/results.json')).size}`);
  for (const k of ['rugby|All Blacks', 'rugby|Black Ferns|w', 'rugby|Wallaroos|w', 'football|Wellington Phoenix', 'football|Auckland FC', 'rugby|Canterbury|w', 'rugby|Auckland Storm|w'])
    lines.push(`${k}: ${(f.form[k] || []).map(x => `${x.d.slice(2)} ${x.r} ${x.o}${x.f ? ' ' + x.f : ''}`).join(' · ') || 'none'}`);
  lines.push('women rugby keys: ' + Object.keys(f.form).filter(k => /^rugby\|.*\|w$/.test(k)).slice(0, 30).join(', '));
} catch (e) { lines.push('read failed: ' + e.message); }
await writeFile(new URL('./out.txt', import.meta.url), lines.join('\n') + '\n');
