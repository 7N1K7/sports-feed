// probe 217: the new Supercars race results and the F1 back-fill, run against the live feed and the real sources
import fs from 'fs';
import * as m from './sources.mjs';
const ua = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi) probe' }, L = [];
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
const sp = (await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=parse&prop=wikitext&redirects=1&page=2026_Supercars_Championship', { headers: ua })).json()).parse.wikitext;
const season = m._supercarsSeason(sp, 2026);
L.push('season rounds: ' + season.map(e => `${e.round} ${e.status} races ${e.raceNos?.join('/')} ${e.link ? 'report' : '-'} score="${e.score || ''}"`).join(' | '));
const live = f.events.filter(e => /^(f1|supercars)-2026-\d+$/.test(e.id));
// the live rounds with the season page's race numbers and status (as the next build will have them)
const events = live.map(e => ({ ...e, ...(e.team === 'supercars' ? { raceNos: season.find(x => x.id === e.id)?.raceNos, status: season.find(x => x.id === e.id)?.status } : {}) }));
const cache = {}, diag = {};
for (let i = 0; i < 3; i++) { await m.supercarsResults(events, cache, diag); L.push(`run ${i + 1}: ${diag.supercarsResults}`); }
L.push('seen: ' + JSON.stringify(diag.supercarsResultsSeen));
for (const e of events.filter(e => e.raceRes)) for (const r of e.raceRes) {
  L.push(`${e.id} ${r.n} src=${r.src} rows=${r.rows.length} link=${r.link} keys=${Object.keys(r.rows[0]).join(',')} kiwis=${r.rows.filter(x => x.nz).map(x => x.d + JSON.stringify(x.nz)).join('; ')}`);
  L.push('   times: ' + r.rows.map(x => `${x.p}:${x.t}${x.x ? '/' + x.x : ''}`).join(' '));
}
const top = {};
await m._f1Past(events, events.find(e => e.id === 'f1-2026-18'), top, cache, diag);
L.push(`f1Past: ${diag.f1Past}`);
for (const [id, rows] of Object.entries(top)) L.push(`${id}: ${rows.length} rows; pts rows ${rows.filter(r => +r.x > 0).length}; kiwis ${rows.filter(r => r.nz).map(r => r.d).join(', ')}; times ${rows.map(r => r.p + ':' + r.t).join(' ')}`);
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
