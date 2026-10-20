// probe 50: state squads through the site's parser, and TheSportsDB badges for the six state sides
import { stateSquads } from './src/sources.mjs';
const diag = {}, sq = await stateSquads(diag);
console.log('squads:', diag.stateSquads);
for (const [k, ps] of Object.entries(sq)) console.log(`  ${k}: ${ps.map(p => p.n + (p.r ? ` (${p.r})` : '') + (p.role ? ` [${p.role}]` : '')).join(', ')}`);
const T = 'https://www.thesportsdb.com/api/v1/json/123/';
const get = async q => { await new Promise(r => setTimeout(r, 2200)); const r = await fetch(T + q); return r.ok ? r.json() : { err: r.status }; };
for (const l of ['Sheffield Shield', 'Australian Sheffield Shield', 'Marsh One-Day Cup', 'Australian One-Day Cup', 'One-Day Cup']) {
  const d = await get('search_all_teams.php?l=' + encodeURIComponent(l));
  console.log(`\nleague "${l}":`, d.err || (d.teams || []).map(t => `${t.strTeam} [${t.strLeague}] badge:${t.strBadge ? 'yes' : 'no'}`).join('; ') || 'none');
}
for (const q of ['Queensland Bulls', 'New South Wales Blues', 'Victoria Bushrangers', 'Victoria', 'South Australia Redbacks', 'Western Australia Warriors', 'Western Warriors', 'Tasmanian Tigers', 'Tasmania']) {
  const d = await get('searchteams.php?t=' + encodeURIComponent(q));
  console.log(`team "${q}":`, d.err || (d.teams || []).filter(t => t.strSport === 'Cricket').map(t => `${t.strTeam} [${t.strLeague} / ${t.strLeague2 || ''}] badge:${t.strBadge ? t.strBadge.replace(/^https:\/\/r2\.thesportsdb\.com\/images\/media\/team\/badge\//, '…/') : 'no'}`).join('; ') || 'no cricket team');
}
