// probe 81: rugby league squads: national team pages (men, women, wheelchair) read with the team squad reader
import { readSquad } from './sources.mjs';
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const men = ['Australia', 'New Zealand', 'England', 'Tonga', 'Samoa', 'Fiji', 'Papua New Guinea', 'Cook Islands', 'Lebanon', 'France', 'Wales', 'Ireland', 'Scotland', 'Jamaica', 'Italy'];
const women = ['Australia', 'New Zealand', 'England', 'Papua New Guinea', 'Fiji', 'Samoa', 'France', 'Wales', 'Cook Islands'];
const wheel = ['England', 'France', 'Australia', 'Wales', 'Ireland', 'Scotland', 'United States', 'New Zealand'];
const titles = [...men.map(t => `${t} national rugby league team`), ...women.map(t => `${t} women's national rugby league team`), ...wheel.map(t => `${t} national wheelchair rugby league team`)];
for (let i = 0; i < titles.length; i += 50) {
  const r = await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(titles.slice(i, i + 50).join('|')), { headers: UA });
  const j = await r.json(), back = {};
  for (const m of [...(j.query?.normalized || []), ...(j.query?.redirects || [])]) back[m.to] = back[m.from] || m.from;
  for (const pg of j.query.pages) {
    const t = pg.revisions?.[0]?.slots?.main?.content || '';
    const heads = [...t.matchAll(/^(==+)\s*([^=]*?(squad|roster|team|players)[^=]*?)\s*\1\s*$/gim)].map(m => m[2]).slice(0, 6);
    const sq = t ? readSquad(t) : [];
    console.log(`${back[pg.title] || pg.title}: ${t ? '' : 'MISSING '}${sq.length} players${sq.length ? ' e.g. ' + sq.slice(0, 3).map(p => p.n + (p.r ? `[${p.r}]` : '')).join(', ') : ''} | headings: ${heads.join(' / ')}`);
  }
}
