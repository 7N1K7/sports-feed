// probe 147: a full feed build with the new form guide (last season's pages, kept results, earlier rounds), and which
// A-League rounds TheSportsDB has for last season
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, stat } from 'node:fs/promises';
const lines = [], t0 = Date.now();
const run = spawnSync('node', ['scripts/fetch.mjs'], { encoding: 'utf8', timeout: 25 * 60e3, maxBuffer: 64e6 });
lines.push(`fetch exit ${run.status} in ${Math.round((Date.now() - t0) / 1000)} s`);
for (const l of (run.stderr || '').split('\n').filter(l => /Error|at file|\.mjs:\d+/.test(l)).slice(0, 15)) lines.push('  ' + l.slice(0, 200));
try {
  const f = JSON.parse(await readFile('data/feed.json', 'utf8'));
  lines.push('form: ' + f.diag.form, 'formNames: ' + (f.diag.formNames || 'ok'));
  for (const k of Object.keys(f.diag)) if (/^tsdb/.test(k)) lines.push(`${k}: ${JSON.stringify(f.diag[k]).slice(0, 160)}`);
  lines.push('wikipedia: ' + JSON.stringify(f.diag.wikipedia));
  const now = Date.now();
  const by = {};
  for (const e of f.events.filter(e => now - Date.parse(e.startUTC) < 21 * 864e5 && /^(rugby|league|football|cricket|netball|basketball|hockey)$/.test(e.sport)))
    for (const t of [e.home, e.away]) { const k = `${e.sport}|${t}`, n = (f.form[k] || f.form[k + '|w'] || f.form[k + '|wc'] || []).length; const c = `${e.sport} · ${e.comp.split(' · ')[0]}`; (by[c] ||= new Map()).set(t, n); }
  for (const [c, m] of Object.entries(by).sort()) lines.push(`${c.padEnd(44)} ${[...m.values()].join(',')}`);
  lines.push(`form ${JSON.stringify(f.form).length} bytes, feed ${JSON.stringify(f).length}, results.json ${(await stat('.cache/results.json')).size}`);
  for (const k of ['rugby|All Blacks', 'rugby|Black Ferns|w', 'rugby|Wallabies', 'football|Wellington Phoenix', 'football|Auckland FC', 'football|Arsenal', 'league|New Zealand', 'league|Kiwis', 'cricket|New Zealand', 'cricket|Sydney Sixers', 'cricket|Sydney Sixers|w', 'netball|Silver Ferns|w', 'basketball|New Zealand Breakers', 'hockey|New Zealand'])
    lines.push(`${k}: ${(f.form[k] || []).map(x => `${x.d.slice(2)} ${x.r} ${x.o}${x.f ? ' ' + x.f : ''}${x.id ? '' : ' (no id)'}`).join(' · ') || 'none'}`);
  lines.push('keys: ' + Object.keys(f.form).filter(k => /Ferns|Kiwi|Blacks|Silver|Breakers|Phoenix|Sticks/.test(k)).join(', '));
} catch (e) { lines.push('read failed: ' + e.message); }
// A-League last season: which rounds exist (regular season's end, finals)
const T = 'https://www.thesportsdb.com/api/v1/json/123/', sleep = ms => new Promise(r => setTimeout(r, ms));
for (const r of [26, 27, 28, 29, 30, 100, 125, 150, 160, 170, 200]) {
  const j = await fetch(`${T}eventsround.php?id=4356&r=${r}&s=2025-2026`).then(r => r.ok ? r.json() : { err: r.status }).catch(e => ({ err: e.message }));
  const ev = j.events || [];
  lines.push(`A-League 2025-2026 r${r}: ${j.err || ''}${ev.length} games${ev.length ? ` ${ev[0].dateEvent}–${ev.at(-1).dateEvent} ${ev[0].strEvent} ${ev[0].intHomeScore}-${ev[0].intAwayScore}` : ''}`);
  await sleep(6500);
}
await writeFile(new URL('./out.txt', import.meta.url), lines.join('\n') + '\n');
