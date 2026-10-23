// probe 128: why the last squad batch comes back empty: the raw API answer for those pages, then teamSquads itself
import { teamSquads, TEAM_PAGES } from './sources.mjs';
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const keys = ['cricket|m|Northern Districts', 'league|m|Lebanon', 'rugby|m|Ireland', 'league|wc|USA', 'rugby|m|France', 'rugby|m|Scotland', 'league|m|New Zealand',
  ...['Cleveland Guardians', 'New York Yankees', 'Chicago White Sox', 'Houston Astros', 'Boston Red Sox', 'Los Angeles Dodgers', 'San Diego Padres', 'Atlanta Braves', 'Philadelphia Phillies', 'Chicago Cubs'].map(t => `baseball|m|${t}`)];
const titles = [...new Set(keys.map(k => TEAM_PAGES[k]).filter(Boolean))];
console.log('titles', titles.length, titles.join(' | '));
for (let cont = {}, n = 0; cont && n < 10; n++) {
  const url = 'https://en.wikipedia.org/w/api.php?format=json&formatversion=2&maxlag=5&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(titles.join('|')) + Object.entries(cont).map(([k, v]) => `&${k}=${encodeURIComponent(v)}`).join('');
  const r = await fetch(url, { headers: UA });
  const t = await r.text();
  let j = {}; try { j = JSON.parse(t); } catch { console.log('not json', r.status, t.slice(0, 200)); break; }
  console.log(`round ${n}: status ${r.status}, ${t.length} bytes, error ${JSON.stringify(j.error || null).slice(0, 200)}, warnings ${JSON.stringify(j.warnings || null).slice(0, 300)}, continue ${JSON.stringify(j.continue || null)}`);
  console.log('  pages:', (j.query?.pages || []).map(p => `${p.title}${p.missing ? ' MISSING' : ''} ${p.revisions?.[0]?.slots?.main?.content?.length || 0}`).join(' | '));
  cont = j.continue?.rvcontinue ? j.continue : null;
}
const diag = {};
const out = await teamSquads(keys, diag);
console.log('teamSquads:', diag.teamSquads);
console.log(out.map(s => `${s.team} ${s.players.length}`).join(', '));
