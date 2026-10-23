import fs from 'fs';
const out = [];
const api = async q => (await fetch('https://en.wikipedia.org/w/api.php?format=json&' + q, { headers: { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi)' } })).json();
for (const s of ['2026–27', '2026', '2027']) for (const q of [`intitle:tri cricket "${s}"`, `intitle:tri-nation cricket "${s}"`, `intitle:"tri-series" "${s}"`]) {
  const r = await api('action=query&list=search&srlimit=50&srnamespace=0&srsearch=' + encodeURIComponent(q));
  out.push(`${q}: ${r.query?.searchinfo?.totalhits} hits: ` + (r.query?.search || []).map(x => x.title).join(' ; '));
}
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
out.push(JSON.stringify(f.diag).match(/.{0,200}Tri.{0,300}/g)?.join('\n') || 'no tri in diag');
fs.writeFileSync(new URL('./out.txt', import.meta.url), out.join('\n'));
