// probe 119: MLB postseason page structure, NPB Climax Series, TheSportsDB baseball badges
const UA = { 'user-agent': 'sports-feed probe (personal site)' };
const raw = async t => { const r = await fetch(`https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(t)}&action=raw`, { headers: UA }); return [r.status, await r.text()]; };
for (const t of ['2026 Major League Baseball postseason', '2026 Climax Series', '2026 Nippon Professional Baseball season', '2026 Major League Baseball season']) {
  const [st, x] = await raw(t);
  console.log('=====', t, st, x.length);
  console.log('headings:', [...x.matchAll(/^(={2,4})\s*(.+?)\s*\1\s*$/gm)].map(m => m[1].length + ':' + m[2]).join(' | '));
  const tpl = {}; for (const m of x.matchAll(/\{\{\s*([^|{}\n]{3,60}?)\s*[|}]/g)) tpl[m[1]] = (tpl[m[1]] || 0) + 1;
  console.log('templates:', Object.entries(tpl).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => `${k}×${v}`).join(', '));
  const i = x.search(/\{\{\s*(MLB Playoff Summary|Baseball playoff summary)/i);
  if (i >= 0) console.log('--- first summary\n' + x.slice(Math.max(0, i - 300), i + 1800));
  const j = x.search(/\{\{\s*linescore/i);
  if (j >= 0) console.log('--- first linescore\n' + x.slice(j, j + 1000));
}
for (const q of ['search_all_teams.php?l=MLB', 'searchteams.php?t=Yokohama%20DeNA%20BayStars', 'searchteams.php?t=Fukuoka%20SoftBank%20Hawks', 'searchteams.php?t=Milwaukee%20Brewers']) {
  try { const r = await fetch('https://www.thesportsdb.com/api/v1/json/123/' + q); const j = await r.json(); const ts = j.teams || [];
    console.log('TSDB', q, r.status, ts.length, ts.slice(0, 40).map(t => `${t.strTeam} [${t.strLeague}/${t.strSport}] ${t.strBadge ? 'badge' : '-'}`).join('; '));
  } catch (e) { console.log('TSDB', q, 'error', e.message); }
}
