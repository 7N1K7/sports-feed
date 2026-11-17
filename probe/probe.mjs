const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
const d = await (await fetch('https://kickoff.kiwi/data/coverage-detail.json?' + Date.now())).json();
const g = d.tvGaps || { nz: [], other: [] };
// TV listings only (titles, channels, times): nothing private, no scores
console.log('v', d.v, 'NZ', g.nz.length, 'other', g.other.length, '| diag', String((f.diag || {}).tvGaps).slice(0, 80));
for (const o of g.nz) console.log('NZ |', o.at.slice(5, 16), '|', o.t.slice(0, 70), '|', o.ch);
console.log('OT:', g.other.map(o => o.t.slice(0, 30)).join(' ; '));
const b = f.events.find(e => /breakers-2026-11-18/.test(e.id)); console.log('breakers 18 Nov tv:', b ? (b.tv || []).map(x => x.ch).join(',') || 'none' : 'not found');
