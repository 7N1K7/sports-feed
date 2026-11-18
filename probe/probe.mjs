// Phoenix women match boxes; Tauihi: season pages, TheSportsDB, the TV guide's listings
import { writeFileSync } from 'node:fs';
const UA = { headers: { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' } };
const out = [], log = s => { out.push(s); };
process.on('exit', () => { try { writeFileSync(new URL('./out.txt', import.meta.url), out.join('\n') + '\n'); } catch {} });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const raw = async t => { await sleep(1300); const r = await fetch('https://en.wikipedia.org/w/index.php?action=raw&redirect=yes&title=' + encodeURIComponent(t), UA); return r.ok ? r.text() : `!${r.status}`; };
const mask = s => s.replace(/\|\s*(score|goals1|goals2|report|result|attendance|referee|penaltyscore|penalties1|penalties2|aet)\s*=[^|]*?(?=\n\s*\||\n\}\})/gis, '|$1=…');
try {
  const x = await raw('2026–27 Wellington Phoenix FC (women) season');
  const i = x.search(/===?\s*Matches\s*===?/), part = x.slice(i);
  const boxes = part.split(/\{\{\s*football box collapsible/i).slice(1);
  log(`PHX matches section at ${i}; ${boxes.length} boxes after it; sections before: ` + [...x.slice(0, i).matchAll(/^==+\s*(.+?)\s*==+$/gm)].map(m => m[1]).join(' / '));
  for (const b of [boxes[0], boxes[3], boxes[4], boxes[10], boxes[boxes.length - 1]].filter(Boolean)) log('  BOX ' + mask(b.split(/\n\}\}/)[0]).replace(/\n/g, ' ⏎ ').slice(0, 520));
  log('  DATES ' + boxes.map(b => `${(b.match(/\|\s*date\s*=\s*([^\n|]*)/) || [])[1]?.trim()} @${(b.match(/\|\s*time\s*=\s*([^\n|]*)/) || [])[1]?.trim() || '-'} [${(b.match(/\|\s*round\s*=\s*([^\n|]*)/) || [])[1]?.trim()}]`).join(' ; '));
} catch (err) { log('PHX error ' + err.message); }
try {
  const x = await raw('Tauihi Basketball Aotearoa');
  log('TAUIHI links: ' + [...new Set([...x.matchAll(/\[\[([^\]|]*(?:season|Tauihi)[^\]|]*)/gi)].map(m => m[1]))].join(' ; ').slice(0, 900));
  log('TAUIHI 2026: ' + (x.match(/[^.\n]*2026[^.\n]*\./g) || []).slice(0, 4).join(' ').slice(0, 700));
  log('TAUIHI clubs: ' + (x.match(/==\s*Current clubs\s*==[\s\S]{0,1400}/) || [''])[0].replace(/\n/g, ' ⏎ ').slice(0, 1200));
} catch (err) { log('TAUIHI error ' + err.message); }
const tsdb = async p => { await sleep(3200); const r = await fetch('https://www.thesportsdb.com/api/v1/json/123/' + p, UA); if (!r.ok) return { err: r.status }; try { return await r.json(); } catch { return { err: 'not json' }; } };
for (const p of ['search_all_leagues.php?c=New%20Zealand&s=Basketball', 'search_all_leagues.php?c=Australia&s=Netball', 'search_all_leagues.php?c=New%20Zealand&s=Netball', 'searchteams.php?t=Whai', 'searchteams.php?t=Southern%20Hoiho', 'searchteams.php?t=Mainland%20Pouakai', 'eventsnextleague.php?id=4805', 'eventsnext.php?id=144130', 'eventslast.php?id=144130']) {
  const d = await tsdb(p); const v = Object.values(d)[0];
  log(`TSDB ${p}: ` + (d.err ? 'error ' + d.err : Array.isArray(v) ? v.slice(0, 12).map(l => l.strLeague && !l.strEvent ? `${l.idLeague} ${l.strLeague}${l.strTeam ? ' / ' + l.strTeam : ''}` : `${l.dateEvent} ${l.strTime} ${l.strEvent} @${l.strVenue || '-'} [${l.strLeague}]${l.intHomeScore != null && l.intHomeScore !== '' ? ' (played)' : ''}`).join(' ;; ') : JSON.stringify(d).slice(0, 200)));
}
try {
  const d = await (await fetch('https://kickoff.kiwi/data/coverage-detail.json?x=' + Date.now())).json();
  const re = /tauihi|k[āa]hu|whai|tokomanawa|pou[āa]kai|hoiho|a-league women|phoenix/i;
  for (const k of ['nz', 'other']) log(`TVGAPS ${k}: ` + (d.tvGaps?.[k] || []).filter(g => re.test(JSON.stringify(g))).map(g => JSON.stringify(g).slice(0, 260)).join(' ;; '));
  log('TVGAPS nz all: ' + (d.tvGaps?.nz || []).map(g => `${g.t} | ${g.at} | ${g.ch}`).join(' ;; ').slice(0, 1500));
} catch (err) { log('TVGAPS error ' + err.message); }
