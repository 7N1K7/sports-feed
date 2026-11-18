// sources for the Phoenix women (A-League Women) and Tauihi: what Wikipedia and TheSportsDB hold
import { writeFile } from 'node:fs/promises';
const UA = { headers: { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' } };
const out = [], log = s => { out.push(s); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const raw = async t => { await sleep(1300); const r = await fetch('https://en.wikipedia.org/w/index.php?action=raw&redirect=yes&title=' + encodeURIComponent(t), UA); return r.ok ? r.text() : `!${r.status}`; };
for (const t of ['2026–27 Wellington Phoenix FC (women) season', '2026–27 A-League Women', '2026 Tauihi Basketball Aotearoa season', 'Tauihi Basketball Aotearoa', '2025 Tauihi Basketball Aotearoa season', '2027 Tauihi Basketball Aotearoa season']) {
  try { const x = await raw(t);
    if (x[0] === '!') { log(`WIKI ${t}: ${x}`); continue; }
    const names = {}; for (const m of x.matchAll(/\{\{\s*([A-Za-z][A-Za-z -]{2,40}?)\s*[\n|]/g)) names[m[1].toLowerCase()] = (names[m[1].toLowerCase()] || 0) + 1;
    log(`WIKI ${t}: ${x.length} chars; templates: ${Object.entries(names).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${k}×${v}`).join(', ')}`);
    log('  HEADINGS ' + [...x.matchAll(/^==+\s*(.+?)\s*==+$/gm)].map(m => m[1]).join(' / ').slice(0, 600));
    const i = x.search(/\{\{\s*(football ?box|basketball ?box)/i);
    if (i >= 0) log('  SAMPLE ' + x.slice(i, i + 700).replace(/\|\s*(score|goals1|goals2|report|H1|H2|Q\d|OT\d?|points1|points2|rebounds\d|assist\d)\s*=[^|\n]*/gi, '|$1=…').replace(/\n/g, ' ⏎ '));
    else { const j = x.search(/==\s*(Regular season|Schedule|Fixtures|Results|Season)[^=]*==/i); log('  PART ' + (j >= 0 ? x.slice(j, j + 900).replace(/\d+\s*[–-]\s*\d+/g, '…').replace(/\n/g, ' ⏎ ') : 'no fixtures section')); }
  } catch (err) { log(`WIKI ${t}: error ${err.message}`); }
}
const tsdb = async p => { await sleep(2600); const r = await fetch('https://www.thesportsdb.com/api/v1/json/123/' + p, UA); if (!r.ok) return { err: r.status }; try { return await r.json(); } catch { return { err: 'not json' }; } };
for (const q of ['Tauihi', 'A-League Women', 'Australian A-League Women', 'New Zealand NBL', 'Super Netball', 'Suncorp Super Netball']) {
  const d = await tsdb('search_all_leagues.php?l=' + encodeURIComponent(q)); log(`TSDB league "${q}": ${d.err ? 'error ' + d.err : JSON.stringify((d.countries || d.leagues || []).slice(0, 3).map(l => [l.idLeague, l.strLeague, l.strSport, l.strCurrentSeason]))}`);
}
for (const q of ['Wellington Phoenix Women', 'Wellington Phoenix', 'Northern Kahu', 'Tokomanawa Queens', 'Mainland Pouakai', 'Southern Hoiho', 'Whai']) {
  const d = await tsdb('searchteams.php?t=' + encodeURIComponent(q)); log(`TSDB team "${q}": ${d.err ? 'error ' + d.err : (d.teams || []).slice(0, 5).map(t => `${t.idTeam} ${t.strTeam} [${t.strSport} / ${t.strLeague} ${t.idLeague}] badge:${t.strBadge ? 'yes' : 'no'}`).join(' ;; ') || 'none'}`);
}
// free crests on Commons for the two Shield sides without one
const get = async q => { await sleep(1300); const r = await fetch('https://commons.wikimedia.org/w/api.php?format=json&formatversion=2&' + q, UA); return r.ok ? r.json() : {}; };
for (const q of ['Western Australia cricket logo', 'WACA logo', 'South Australia cricket logo', 'South Australian Cricket Association logo']) { const c = await get('action=query&list=search&srnamespace=6&srlimit=6&srsearch=' + encodeURIComponent(q)); log(`COMMONS "${q}": ` + ((c.query?.search || []).map(x => x.title.replace(/^File:/, '')).join(' ;; ').slice(0, 400) || 'none')); }
await writeFile(new URL('./out.txt', import.meta.url), out.join('\n') + '\n');
