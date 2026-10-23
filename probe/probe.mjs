// probe 143: squad pages for NZ women's cricket sides and Farah Palmer Cup sides
import { readSquad } from './sources.mjs';
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const groups = [
  ["Central Districts women's cricket team", 'Central Hinds', "Auckland women's cricket team", 'Auckland Hearts', "Canterbury women's cricket team", 'Canterbury Magicians', "Otago women's cricket team", 'Otago Sparks', "Wellington women's cricket team", 'Wellington Blaze'],
  ['Wellington Pride', 'Northland Kauri', 'Auckland Storm', 'Canterbury (Farah Palmer Cup)', 'Canterbury women\'s rugby union team', 'Waikato (Farah Palmer Cup)', 'Bay of Plenty Volcanix', 'Counties Manukau Heat', 'Otago Spirit', 'Hawke\'s Bay Tui', 'Manawatu Cyclones', 'Taranaki Whio', 'Matatū', 'Waikato (women\'s rugby union team)'],
];
for (const titles of groups) {
  const j = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(titles.join('|')), { headers: UA })).json();
  const back = {}; for (const m of [...(j.query?.normalized || []), ...(j.query?.redirects || [])]) back[m.to] = back[m.from] || m.from;
  for (const p of j.query?.pages || []) { const c = p.revisions?.[0]?.slots?.main?.content || '';
    const sq = c ? readSquad(c) : [];
    const heads = [...c.matchAll(/^(=+)[^=\n]*(squad|roster|players|team)[^=\n]*\1\s*$/gim)].map(m => m[0].trim()).join(' / ');
    console.log(`${back[p.title] || p.title} => ${p.title}${p.missing ? ' MISSING' : ''} ${c.length} | squad ${sq.length} ${sq.slice(0, 3).map(x => x.n + (x.r ? ` (${x.r})` : '')).join(', ')} | ${heads.slice(0, 160)}`); }
  await new Promise(r => setTimeout(r, 1500));
}
