// probe 122: the live feed's baseball and NBA (diag and counts), and free news feeds for the NBA, MLB and Japanese baseball
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
try {
  const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
  console.log('generated', f.generated, 'version', f.version);
  console.log('diag.baseball:', JSON.stringify(f.diag?.baseball));
  console.log('diag.nba:', JSON.stringify(f.diag?.nba));
  for (const t of ['mlb', 'npb', 'nba']) {
    const ev = f.events.filter(e => e.team === t);
    console.log(`== ${t}: ${ev.length} events`);
    for (const e of ev.slice(0, 40)) console.log(' ', e.startUTC, e.status, e.timeTBC ? 'TBC' : '', e.comp, '|', e.stage || '', '|', e.away, '@', e.home, '|', e.city, e.tz);
  }
  for (const t of (f.tables || []).filter(t => /MLB|Japan|NBA/.test(t.comp))) console.log('table', t.comp, '|', t.title, '|', t.rows?.length, 'rows; top', t.rows?.[0]?.team, JSON.stringify(t.rows?.[0]).slice(0, 160));
} catch (e) { console.log('feed error', e.message); }
const FEEDS = [
  'https://www.sbnation.com/rss/nba/index.xml', 'https://www.sbnation.com/rss/mlb/index.xml',
  'https://feeds.bbci.co.uk/sport/basketball/rss.xml', 'https://feeds.bbci.co.uk/sport/basketball/nba/rss.xml', 'https://feeds.bbci.co.uk/sport/baseball/rss.xml',
  'https://www.theguardian.com/sport/nba/rss', 'https://www.theguardian.com/sport/mlb/rss', 'https://www.theguardian.com/sport/baseball/rss',
  'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/sport/basketball/?outputType=xml&_website=nzh',
  'https://www.japantimes.co.jp/sports/baseball/feed/', 'https://www.yakyucosmo.com/feed/', 'https://npbreport.com/feed/', 'https://www.npbtracker.com/feed/',
  'https://www.mlb.com/feeds/news/rss.xml', 'https://www.cbssports.com/rss/headlines/nba/', 'https://www.cbssports.com/rss/headlines/mlb/',
];
for (const u of FEEDS) {
  try {
    const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(12000) });
    const x = await r.text();
    const items = [...x.matchAll(/<(item|entry)>([\s\S]*?)<\/\1>/g)];
    const t = items.slice(0, 4).map(m => ((m[2].match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim() + ' @ ' + ((m[2].match(/<(pubDate|published|updated)>([^<]+)/) || [])[2] || ''));
    const rights = (x.match(/<(copyright|rights)[^>]*>([\s\S]*?)<\/\1>/) || [])[2] || '';
    console.log(`== ${u}: ${r.status} ${items.length} items${rights ? ' rights: ' + rights.slice(0, 150) : ''}`);
    for (const s of t) console.log('   ', s.slice(0, 160));
  } catch (e) { console.log(`== ${u}: error ${e.message}`); }
}
