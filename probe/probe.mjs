// probe 117: v396 live: Kiwi-in events
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
console.log('generated', f.generatedAt);
console.log('womenNoKiwi:', f.diag.womenNoKiwi);
console.log('herald:', f.diag.herald);
for (const e of f.events.filter(e => e.team === 'lpga' || (e.sport === 'boxing' && /women/i.test(e.comp)))) console.log(e.team, '|', e.comp, '|', e.home, e.away ? 'v ' + e.away : '', '|', e.note || '');
const h = await (await fetch('https://kickoff.kiwi/?' + Date.now())).text();
console.log('coffee in settings:', h.includes('class="pcoffee"'), '| footer fcof:', h.includes('fbtns fcof'));
