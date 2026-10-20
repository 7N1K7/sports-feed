// probe 75: which Wikipedia pages have a current squad we could read, and in what form (table rows, templates)
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const GROUPS = {
  'Ford Trophy': ['Auckland cricket team', 'Northern Districts cricket team', 'Central Districts cricket team', 'Canterbury cricket team', 'Wellington cricket team', 'Otago cricket team'],
  'Breakers (NBL)': ['New Zealand Breakers'],
  'WBBL': ['Sydney Sixers (WBBL)', 'Perth Scorchers (WBBL)', 'Melbourne Stars (WBBL)'],
  'A-League': ['Wellington Phoenix FC', 'Auckland FC'],
  'NPC': ['Auckland Rugby Union', 'Canterbury Rugby Football Union', 'Wellington Rugby Football Union', 'Taranaki Rugby Football Union', 'Waikato Rugby Union'],
  'All Blacks / Black Ferns': ['New Zealand national rugby union team', "New Zealand women's national rugby union team"],
  'RLWC squads': ['2026 Rugby League World Cup squads', "2026 Women's Rugby League World Cup squads", '2026 Wheelchair Rugby League World Cup squads', "2026 Men's Rugby League World Cup squads"],
  'Super Rugby': ['Blues (Super Rugby)', 'Chiefs (rugby union)'],
};
for (const [g, titles] of Object.entries(GROUPS)) {
  await sleep(1500);
  const r = await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(titles.join('|')), { headers: UA });
  const j = r.ok ? await r.json() : {};
  const back = Object.fromEntries((j.query?.redirects || []).map(x => [x.to, x.from]));
  console.log(`\n== ${g}`);
  for (const pg of j.query?.pages || []) {
    const t = pg.revisions?.[0]?.slots?.main?.content || '';
    if (!t) { console.log(`  ${back[pg.title] || pg.title}: MISSING`); continue; }
    const heads = [...t.matchAll(/^(==+)\s*([^=]*?(squad|roster|players|team)[^=]*?)\s*\1\s*$/gim)].map(m => m[2]).slice(0, 8);
    const i = t.search(/^==+\s*(current |first[- ]team |senior )?(squad|roster)\b[^=]*==+\s*$/im);
    let info = 'no squad section';
    if (i >= 0) {
      const sec = t.slice(i).replace(/^[^\n]*\n/, ''), j2 = sec.search(/^==[^=]/m), body = j2 < 0 ? sec : sec.slice(0, j2);
      const tpl = [...new Set([...body.matchAll(/\{\{\s*([A-Za-z][\w -]{2,30}?)\s*[|}]/g)].map(m => m[1].trim()))].slice(0, 8);
      info = `section ${body.length} chars, ${(body.match(/\[\[/g) || []).length} links, table ${/\{\|/.test(body) ? 'yes' : 'no'}, templates: ${tpl.join(', ')}`;
    }
    console.log(`  ${back[pg.title] || pg.title} -> ${pg.title}: ${info}\n     headings: ${heads.join(' | ')}`);
  }
}
