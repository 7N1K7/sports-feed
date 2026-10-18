// read the live feed and print the Premier League table
const f = await (await fetch('https://7n1k7.github.io/sports-feed/data/feed.json?v=' + Date.now())).json();
console.log('generatedAt', f.generatedAt);
for (const t of f.tables.filter(t => /Premier League/.test(t.page))) { console.log(t.page, '|', t.title, '|', t.style, '|', t.rows.length); for (const r of t.rows) console.log(JSON.stringify(r)); }
console.log(f.tables.map(t => `${t.page}/${t.title}: ${t.rows.length} rows, played ${t.rows.reduce((s, r) => s + r.p, 0)}`).join('\n'));
