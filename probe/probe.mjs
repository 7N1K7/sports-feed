// dump wikitext of table source pages and their transcluded table templates, as JSON
const UA = { 'User-Agent': 'sports-feed probe (https://7n1k7.github.io/sports-feed/)' };
const api = async q => (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&' + q, { headers: UA })).json();
const titles = ['2026–27 Premier League', '2026 Hilux NPC', '2026 Super Rugby Pacific season', '2026–27 A-League Men', '2026 NRL season', "2026 Men's Rugby League World Cup", '2026–27 Big Bash League season', '2026 Nations Championship'];
const out = {};
const RE = /\{\{\s*([^{}|#\n]{4,90}?(?:table|standings|ladder))\s*\}\}/gi;
for (const t of titles) {
  const r = await api('action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(t));
  const pg = r.query.pages[0];
  out[t] = pg.revisions?.[0].slots.main.content || '';
  const names = [...new Set([...out[t].matchAll(RE)].map(m => 'Template:' + m[1].trim()))].filter(n => !/^Template:(wide table|table alignment)/i.test(n));
  for (const n of names) {
    const r2 = await api('action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(n));
    out['TPL ' + t + ' :: ' + n] = { redirects: r2.query.redirects, missing: r2.query.pages[0].missing, title: r2.query.pages[0].title, text: r2.query.pages[0].revisions?.[0].slots.main.content || '' };
  }
}
console.log(JSON.stringify(out));
