import { writeFileSync } from 'fs';
const out = [];
const T = 'https://www.thesportsdb.com/api/v1/json/123/';
const get = async u => { await new Promise(r => setTimeout(r, 2100)); const r = await fetch(T + u); if (!r.ok) throw new Error(r.status); return r.json(); };
const row = l => `${l.idLeague} | ${l.strSport} | ${l.strLeague} | ${l.strLeagueAlternate || ''} | ${l.strCountry || ''} | badge ${l.strBadge || '-'} | logo ${l.strLogo || '-'}`;
// leagues the feed reads, by id
for (const id of [4356, 4328, 4416, 4551, 5793, 5794, 4443, 5806, 5278, 5479, 5852, 5807, 4434]) {
  try { const j = await get('lookupleague.php?id=' + id); for (const l of j.leagues || []) out.push('id ' + row(l)); } catch (e) { out.push('id ' + id + ' error ' + e.message); }
}
// the rest, by country and sport
for (const [c, s] of [['Australia', 'Cricket'], ['New Zealand', 'Cricket'], ['New Zealand', 'Rugby'], ['World', 'Rugby'], ['Australia', 'Rugby'], ['World', 'Cricket'], ['World', 'Rugby League'], ['Australia', 'Rugby League'], ['New Zealand', 'Netball'], ['World', 'Netball'], ['World', 'Field Hockey'], ['World', 'Tennis'], ['World', 'Motorsport'], ['Australia', 'Motorsport'], ['World', 'Golf'], ['Australia', 'Golf'], ['World', 'Sailing'], ['World', 'Basketball'], ['Japan', 'Baseball'], ['World', 'Fighting'], ['World', 'Boxing']]) {
  try { const j = await get(`search_all_leagues.php?c=${encodeURIComponent(c)}&s=${encodeURIComponent(s)}`); const ls = j.countries || j.countrys || j.leagues || [];
    out.push(`${c} ${s}: ${ls.length}`); for (const l of ls) out.push('  ' + row(l)); } catch (e) { out.push(`${c} ${s} error ${e.message}`); }
}
writeFileSync('probe/out.txt', 'lg310\n' + out.join('\n') + '\n');
