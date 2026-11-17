const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
console.log('diag.tvGaps:', String((f.diag || {}).tvGaps).slice(0, 300));
const d = await (await fetch('https://kickoff.kiwi/data/coverage-detail.json?' + Date.now())).json();
const g = d.tvGaps || { nz: [], other: [] };
// TV listings only (titles, channels, times): nothing private, no scores
console.log('v', d.v, 'NZ', g.nz.length, 'other', g.other.length);
for (const o of g.nz) console.log('NZ |', o.at.slice(5, 16), '|', o.t.slice(0, 70), '|', o.ch, '|', (o.d || '').slice(0, 110));
for (const o of g.other) console.log('OT |', o.at.slice(5, 16), '|', o.t.slice(0, 60), '|', o.n, '|', o.ch);
