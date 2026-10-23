// probe 136: candidate squad pages for NPC sides, more rugby nations, the netball sides and the A sides
import { readSquad } from './sources.mjs';
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const NPC = ['Auckland', 'Bay of Plenty', 'Canterbury', 'Counties Manukau', "Hawke's Bay", 'Manawatu', 'North Harbour', 'Northland', 'Otago', 'Southland', 'Taranaki', 'Tasman', 'Waikato', 'Wellington'];
const groups = [
  NPC.map(t => `${t} rugby union team`), NPC.map(t => `${t} (National Provincial Championship)`),
  ['United States national rugby union team', 'Japan national rugby union team', 'Fiji national rugby union team', 'Samoa national rugby union team', 'Tonga national rugby union team', 'Georgia national rugby union team', 'Australia national rugby union team',
   'New Zealand national netball team', 'Australia national netball team', 'New Zealand A cricket team', 'India A cricket team', 'Northern Districts women\'s cricket team'],
];
for (const titles of groups) {
  const j = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(titles.join('|')), { headers: UA })).json();
  const back = {}; for (const m of [...(j.query?.normalized || []), ...(j.query?.redirects || [])]) back[m.to] = back[m.from] || m.from;
  for (const p of j.query?.pages || []) { const c = p.revisions?.[0]?.slots?.main?.content || '';
    const sq = c ? readSquad(c) : [];
    const heads = [...c.matchAll(/^(=+)[^=\n]*(squad|roster|players|team)[^=\n]*\1\s*$/gim)].map(m => m[0].trim()).join(' / ');
    console.log(`${back[p.title] || p.title} => ${p.title}${p.missing ? ' MISSING' : ''} ${c.length} | squad ${sq.length} ${sq.slice(0, 3).map(x => x.n + (x.r ? ` (${x.r})` : '')).join(', ')} | ${heads.slice(0, 200)}`); }
  await new Promise(r => setTimeout(r, 1500));
}
