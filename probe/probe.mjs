import fs from 'fs';
const out = [];
const j = async u => { try { const r = await fetch(u, { headers: { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi)' } }); return await r.json(); } catch (e) { return { err: e.message }; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const W = 'https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=';
const pages = async (t, sec) => { const r = await j(W + encodeURIComponent(t.join('|')) + (sec != null ? '&rvsection=' + sec : '')); return Object.fromEntries((r.query?.pages || []).map(p => [p.title, p.revisions?.[0]?.slots?.main?.content || '(missing)'])); };
// 1. NBA arenas list
let p = await pages(['List of National Basketball Association arenas']);
let t = Object.values(p)[0];
const i = t.search(/==\s*Current arenas\s*==/i);
out.push('NBA arenas page len ' + t.length + ' current at ' + i);
out.push(t.slice(i < 0 ? 0 : i, (i < 0 ? 0 : i) + 2500));
// 2. Australasia schedule raw rows
p = await pages(['2026–27 PGA Tour of Australasia', '2026 PGA Tour']);
for (const [k, v] of Object.entries(p)) { const s = v.search(/==\s*Schedule/i); out.push('== ' + k + '\n' + v.slice(s, s + 1800)); }
// 3. tournament infobox course
p = await pages(['Butterfield Bermuda Championship', 'New Zealand Open', 'Australian Open (golf)', 'Australian PGA Championship', 'Players Series SA', 'Queensland PGA Championship', 'RSM Classic', 'Mexico Open'], 0);
for (const [k, v] of Object.entries(p)) out.push(`-- ${k}: ` + (v.match(/\|\s*(course|venue|location)\s*=[^\n]*/gi) || []).join(' ; ').slice(0, 300));
// 4. TSDB cricket leagues in Australia
const B = 'https://www.thesportsdb.com/api/v1/json/123/';
const all = await j(B + 'search_all_leagues.php?c=Australia&s=Cricket'); await sleep(2100);
out.push('tsdb AU cricket: ' + JSON.stringify((all.countries || all.countrys || []).map(l => [l.idLeague, l.strLeague, l.strCurrentSeason])));
fs.writeFileSync(new URL('./out.txt', import.meta.url), out.join('\n'));
