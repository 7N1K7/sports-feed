// probe 26: where Black Sticks fixtures live on Wikipedia, and how their match boxes are written
const UA = { 'user-agent': 'sports-feed/1.0 (https://kickoff.kiwi/; personal non-commercial site)' };
const api = async q => { await new Promise(r => setTimeout(r, 700)); return (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&' + q, { headers: UA })).json(); };
const searches = ["Black Sticks 2026", "Black Sticks 2027", "2026–27 Men's FIH Pro League", "2026–27 Women's FIH Pro League", "2026–27 FIH Hockey Nations Cup", "2027 Men's FIH Hockey Nations Cup", "2026 Men's FIH Hockey World Cup", "2026 Women's FIH Hockey World Cup", "Oceania Cup hockey 2027", "hockey 2026 Commonwealth Games", "2026 Men's Oceania Cup field hockey", "New Zealand men's national field hockey team results"];
for (const s of searches) { const r = await api('action=query&list=search&srlimit=6&srsearch=' + encodeURIComponent(s)); console.log('SEARCH', s, '=>', (r.query?.search || []).map(x => x.title).join(' | ')); }
// for the most likely pages: templates used for matches, and lines naming New Zealand with dates
const pages = ["2026–27 Men's FIH Pro League", "2026–27 Women's FIH Pro League", "2025–26 Men's FIH Pro League", "2025–26 Women's FIH Pro League", "2026 Men's FIH Hockey World Cup", "2026 Women's FIH Hockey World Cup", "2025–26 Men's FIH Hockey Nations Cup", "2026–27 Men's FIH Hockey Nations Cup", "2026–27 Women's FIH Hockey Nations Cup", "New Zealand men's national field hockey team", "New Zealand women's national field hockey team", "Field hockey at the 2026 Commonwealth Games"];
for (const t of pages) {
  const r = await api('action=parse&prop=wikitext&redirects=1&page=' + encodeURIComponent(t));
  const w = r.parse?.wikitext || '';
  if (!w) { console.log('\n## PAGE', t, 'missing', r.error?.code || ''); continue; }
  const tpls = {}; for (const m of w.matchAll(/\{\{\s*([A-Za-z][\w \-]{1,30}?)\s*\n?\|/g)) tpls[m[1].trim()] = (tpls[m[1].trim()] || 0) + 1;
  console.log('\n## PAGE', r.parse.title, w.length, 'chars | templates:', Object.entries(tpls).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${k}×${v}`).join(', '));
  const i = w.search(/\{\{\s*(hockey ?box|field ?hockey ?box|hockeybox|football ?box)/i);
  if (i >= 0) console.log('FIRST BOX:', w.slice(i, i + 700).replace(/\n/g, ' ⏎ '));
  const nz = [...w.matchAll(/[^\n]*New Zealand[^\n]*/g)].map(m => m[0]).filter(l => /\d{4}|\bscore|team1|team2|home|away/i.test(l)).slice(0, 6);
  if (nz.length) console.log('NZ LINES:', nz.join(' ⏎ ').slice(0, 900));
}
