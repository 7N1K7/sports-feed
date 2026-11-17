const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
const v = await (await fetch('https://kickoff.kiwi/data/version.json?' + Date.now())).json().catch(() => ({}));
console.log('version', v.version, '| tvGuide', String(f.diag.tvGuide).slice(0, 150), '| tvGaps', String(f.diag.tvGaps).slice(0, 60));
// names, times and channels only: no scores
for (const e of f.events.filter(e => /^(bc-ind-test1-2026|bs-ind-centenary-1-2026|wmseries-2026-g2|wbbl-12-m28)/.test(e.id) || /breakers-2026-11-21/.test(e.id))) console.log(e.id.slice(0, 40), '|', e.startUTC, '| tv', (e.tv || []).map(x => x.ch + '@' + x.at.slice(5, 16) + (x.delayed ? ' delayed' : '')).join(', ') || 'none');
const withTv = f.events.filter(e => e.tv && e.status !== 'final').length; console.log('games with a TV listing:', withTv);
