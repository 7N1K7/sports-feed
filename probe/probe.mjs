const UA = { headers: { 'user-agent': 'kickoff-kiwi-probe/1.0' } };
const raw = async t => { const r = await fetch('https://en.wikipedia.org/w/index.php?action=raw&redirect=yes&title=' + encodeURIComponent(t), UA); return r.ok ? r.text() : ''; };
// fixture lines only (date, time, venue): score lines are left out
let x = await raw("2026–27 Women's Big Bash League season");
console.log('WBBL page length', x.length);
for (const m of x.matchAll(/\{\{\s*(?:Limited overs matches|Single-innings cricket match)[\s\S]*?\n\}\}/gi)) { const b = m[0]; if (!/Strikers/.test(b) || !/Renegades/.test(b)) continue; console.log(b.split('\n').filter(l => /^\s*\|\s*(date|time|daynight|venue|team1|team2|round)\s*=/.test(l)).join(' ; ').slice(0, 500)); }
x = await raw("New Zealand men's national netball team");
console.log('NZ men netball page length', x.length, '| mentions 2026:', (x.match(/2026/g) || []).length, '| headings:', [...x.matchAll(/^==+\s*([^=]+?)\s*==+$/gm)].map(m => m[1]).join(' ; ').slice(0, 400));
