// probe 115: v392 live: women's events with no Kiwi left out
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
console.log('generated', f.generatedAt);
console.log('womenNoKiwi:', f.diag.womenNoKiwi);
const by = {};
for (const e of f.events.filter(e => /women/i.test([e.comp, e.home, e.away].join(' ')) || e.team === 'lpga')) { const k = `${e.team} | ${String(e.comp).replace(/,.*/, '')}`; by[k] = (by[k] || 0) + 1; }
console.log(by);
for (const e of f.events.filter(e => e.team === 'lpga' || e.team === 'rlwc' || e.sport === 'tennis')) console.log(e.team, '|', e.comp, '|', e.home, e.away ? 'v ' + e.away : '');
