import { writeFileSync } from 'fs';
const out = [];
const T = 'https://www.thesportsdb.com/api/v1/json/123/';
const wait = ms => new Promise(r => setTimeout(r, ms));
const get = async u => { for (let i = 0; i < 3; i++) { await wait(6500 + i * 15000); const r = await fetch(T + u); if (r.ok) return r.json(); if (r.status !== 429) throw new Error(r.status); } throw new Error('429 x3'); };
const row = l => `${l.idLeague} | ${l.strSport} | ${l.strLeague} | ${l.strLeagueAlternate || ''} | ${l.strCountry || ''} | badge ${(l.strBadge || '-').replace(/^.*league\//, '')} | logo ${(l.strLogo || '-').replace(/^.*league\//, '')}`;
const badges = new Set();
for (const [c, s] of [['Australia', 'Cricket'], ['World', 'Rugby'], ['World', 'Cricket'], ['New Zealand', 'Rugby'], ['Australia', 'Basketball'], ['World', 'Motorsport'], ['Australia', 'Motorsport'], ['World', 'Tennis'], ['World', 'Sailing'], ['World', 'Golf']]) {
  try { const j = await get(`search_all_leagues.php?c=${encodeURIComponent(c)}&s=${encodeURIComponent(s)}`); const ls = j.countries || j.countrys || j.leagues || [];
    out.push(`${c} ${s}: ${ls.length}`); for (const l of ls) { out.push('  ' + row(l)); } } catch (e) { out.push(`${c} ${s} error ${e.message}`); }
}
writeFileSync('probe/out.txt', 'lg311\n' + out.join('\n') + '\n');
