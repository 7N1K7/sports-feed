const UA = { headers: { 'user-agent': 'kickoff-kiwi-probe/1.0' } };
const raw = async t => { const r = await fetch('https://en.wikipedia.org/w/index.php?action=raw&redirect=yes&title=' + encodeURIComponent(t), UA); return r.ok ? r.text() : ''; };
const x = await raw('2026 NASCAR Cup Series');
const i = x.search(/^==\s*Schedule\s*==/m), j = x.search(/^==\s*Results and standings\s*==/m);
// schedule only (no results): names, tracks, dates
console.log(x.slice(i, j));
