import fs from 'fs';
const out = [];
const j = async u => { try { const r = await fetch(u, { headers: { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi)' } }); return await r.json(); } catch (e) { return { err: e.message }; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const l of ['Sheffield Shield', 'Australian NBL', 'NBA']) {
  const d = await j('https://www.thesportsdb.com/api/v1/json/123/search_all_teams.php?l=' + encodeURIComponent(l)); await sleep(2100);
  out.push(l + ': ' + (d.teams || []).map(t => `${t.strTeam}${t.strTeamAlternate ? ' / ' + t.strTeamAlternate : ''}${t.strBadge ? '' : ' (no badge)'}`).join('; '));
}
for (const q of ['South Australia', 'Western Australia', 'South Australia Redbacks', 'Western Australia Warriors', 'Los Angeles Clippers', 'Central Hinds', 'Central Districts Hinds', 'Central Districts', 'South East Melbourne Phoenix']) {
  const d = await j('https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=' + encodeURIComponent(q)); await sleep(2100);
  out.push('Q ' + q + ': ' + (d.teams || []).map(t => `${t.strTeam} [${t.strSport}/${t.strLeague}]${t.strBadge ? ' badge' : ''}`).join('; '));
}
// the NBL page's boxes for the two odd names
const w = await j('https://en.wikipedia.org/w/api.php?format=json&action=parse&prop=wikitext&formatversion=2&page=' + encodeURIComponent('2026–27 NBL season'));
const t = w.parse?.wikitext || '';
for (const re of [/[^\n]*Bullets[^\n]*/g, /[^\n]*S\.E[^\n]*/g]) out.push((t.match(re) || []).slice(0, 6).join('\n'));
fs.writeFileSync(new URL('./out.txt', import.meta.url), out.join('\n'));
