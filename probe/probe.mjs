// probe 27: every Black Sticks match box on the candidate pages: date, time, teams, venue, score, and the page's time-zone note
const UA = { 'user-agent': 'sports-feed/1.0 (https://kickoff.kiwi/; personal non-commercial site)' };
const api = async q => { await new Promise(r => setTimeout(r, 700)); return (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&' + q, { headers: UA })).json(); };
const pages = ["2026–27 Men's FIH Pro League", "2026–27 Women's FIH Pro League", "2025–26 Men's FIH Pro League", "2025–26 Women's FIH Pro League", "New Zealand men's national field hockey team", "New Zealand women's national field hockey team", "2026 Men's FIH Hockey World Cup", "2026 Women's FIH Hockey World Cup", "2025–26 Women's FIH Hockey Nations Cup"];
for (const t of pages) {
  const r = await api('action=parse&prop=wikitext&redirects=1&page=' + encodeURIComponent(t));
  const w = r.parse?.wikitext || '';
  if (!w) { console.log('\n##', t, 'missing'); continue; }
  const notes = [...w.matchAll(/[^\n]*(All times|times are|UTC[+−-]\d)[^\n]*/gi)].map(m => m[0]).slice(0, 3);
  console.log('\n##', t, '| tz notes:', notes.join(' || ').slice(0, 300));
  const boxes = [...w.matchAll(/\{\{\s*(fieldhockeybox|football box collapsible)([\s\S]*?)\n\}\}/gi)].map(m => m[2]);
  const f = (b, k) => ((b.match(new RegExp(`\\|\\s*${k}\\s*=([^\\n]*)`)) || [])[1] || '').trim();
  const nz = boxes.filter(b => /NZL/.test(f(b, 'team1') + f(b, 'team2')));
  console.log('boxes', boxes.length, 'with NZL', nz.length);
  for (const b of nz.slice(-14)) console.log('  ', f(b, 'date'), '|', f(b, 'time'), '|', f(b, 'team1'), 'v', f(b, 'team2'), '|', f(b, 'score'), '|', (f(b, 'stadium') + ' ' + f(b, 'location')).slice(0, 90), '|', f(b, 'round').slice(0, 40));
}
