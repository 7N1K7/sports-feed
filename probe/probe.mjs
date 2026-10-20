// probe 98: every team page in TEAM_PAGES read with the new squad reader; Forest's and ND's squad text
import { TEAM_PAGES, readSquad } from './sources.mjs';
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const titles = [...new Set(Object.values(TEAM_PAGES)), 'Northern Brave', 'Northern Districts cricket team'];
const text = {};
for (let i = 0; i < titles.length; i += 50) {
  const q = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(titles.slice(i, i + 50).join('|')), { headers: UA })).json();
  const back = {}; for (const m of [...(q.query.normalized || []), ...(q.query.redirects || [])]) back[m.to] = back[m.from] || m.from;
  for (const pg of q.query.pages) text[back[pg.title] || pg.title] = pg.missing ? null : pg.revisions[0].slots.main.content;
}
const bad = [];
for (const [k, t] of Object.entries(TEAM_PAGES)) { const ps = text[t] ? readSquad(text[t]) : []; const uniq = new Set(ps.map(p => p.n)).size; if (ps.length < 8 || uniq < ps.length * 0.8) bad.push(`${k} (${ps.length}${text[t] === null ? ', page missing' : ''}${ps.length ? ': ' + ps.slice(0, 3).map(p => p.n).join(', ') : ''})`); }
console.log('not reading:', bad.length, '\n ' + bad.join('\n '));
for (const t of ['Nottingham Forest F.C.', 'Northern Brave', 'Northern Districts cricket team']) { const x = text[t]; if (!x) { console.log('\n', t, 'missing'); continue; } const i = x.search(/current squad/i); console.log(`\n### ${t}\n` + x.slice(i, i + 1500)); }
