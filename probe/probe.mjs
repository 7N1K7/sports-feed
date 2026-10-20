// probe 99: the doubles race (teams) tables on the ATP and WTA rankings pages
import { grid } from './rankings.mjs';
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
for (const page of ['ATP rankings', 'WTA rankings']) {
  const r = await (await fetch(`https://en.wikipedia.org/w/api.php?action=parse&format=json&formatversion=2&prop=text&redirects=1&page=${encodeURIComponent(page)}`, { headers: UA })).json();
  for (const t of r.parse.text.match(/<table[\s\S]*?<\/table>/gi)) {
    if (!/doubles race|rankings \(doubles\)/i.test(t)) continue;
    const g = grid(t);
    console.log(`\n### ${page}: heads ${JSON.stringify(g.heads)}`);
    for (const row of g.rows.slice(0, 5)) console.log('   ', JSON.stringify(row));
  }
}
