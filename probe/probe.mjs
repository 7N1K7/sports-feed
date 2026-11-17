const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
console.log('now', new Date().toISOString(), 'generatedAt', f.generatedAt, 'age min', Math.round((Date.now() - Date.parse(f.generatedAt)) / 6e4), 'events', f.events.length);
// flags: names, dates and competitions only, never a score
const ck = f.checks || {};
for (const x of ck.noResult || []) console.log('NR |', JSON.stringify(x).slice(0, 260));
for (const x of ck.thinWeeks || []) console.log('TW |', JSON.stringify(x).slice(0, 260));
const d = await (await fetch('https://kickoff.kiwi/data/coverage-detail.json?' + Date.now())).json();
const g = d.tvGaps || { nz: [], other: [] };
for (const o of g.nz) console.log('NZ |', o.at.slice(5, 16), '|', o.t.slice(0, 80), '|', o.ch, '|', (o.d || '').slice(0, 90));
console.log('OT:', g.other.map(o => o.t.slice(0, 30)).join(' ; '));
const ids = new Set(["bs-ind-centenary-1-2026", "ps-r1-1-2026", "ps-r1-2-2026", "ps-r1-3-2026", "bc-ind-test1-2026", "pak-sl-t2-2026", "wbbl-12-m25-adelaide-strikers-v-sydney-sixers", "wbbl-12-m26-hobart-hurricanes-v-perth-scorchers", "wbbl-12-m27-brisbane-heat-v-sydney-thunder", "wbbl-12-m28-adelaide-strikers-v-melbourne-renegades", "wmseries-2026-g1", "wmseries-2026-g2"]);
for (const e of f.events.filter(e => ids.has(e.id))) console.log('HK |', e.id, '|', e.startUTC, '|', e.home, 'v', e.away, '|', e.venue, '|', e.status, '| tv', (e.tv || []).map(x => x.ch + '@' + x.at.slice(5, 16) + (x.delayed ? 'd' : '')).join(', ') || 'none');
