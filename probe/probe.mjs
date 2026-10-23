// probe 130: where Northern Districts' cricket page is now, and every side's squad with the new readers
import { teamSquads, TEAM_PAGES } from './sources.mjs';
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const cands = ['Northern Brave', 'Northern Districts (cricket team)', 'Northern Districts Cricket Association', 'Northern Brave (cricket team)', 'Northern Districts women\'s cricket team', 'Northern Brave (women)'];
const j = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(cands.join('|')), { headers: UA })).json();
console.log('redirects', JSON.stringify(j.query?.redirects || []));
for (const p of j.query?.pages || []) { const t = p.revisions?.[0]?.slots?.main?.content || '';
  console.log(`${p.title}${p.missing ? ' MISSING' : ''} ${t.length} headings: ${[...t.matchAll(/^(=+)[^=\n]+\1\s*$/gm)].map(m => m[0].trim()).join(' / ').slice(0, 600)}`); }
const diag = {};
const out = await teamSquads(Object.keys(TEAM_PAGES), diag);
console.log('\nteamSquads:', diag.teamSquads);
console.log(out.map(s => `${s.team} ${s.players.length}`).join(', '));
const pick = n => out.find(s => s.team === n);
for (const n of ['Lebanon', 'New York Yankees', 'Chicago Cubs']) console.log(n, JSON.stringify(pick(n)?.players.slice(0, 5)));
