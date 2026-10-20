// probe 83: tennis in the live feed; ATP/WTA doubles tables; NZ/Aus tennis pages coming up; more YouTube channels
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const f = await (await fetch('https://kickoff.kiwi/data/feed.json')).json();
console.log('feed tennis events:'); for (const e of f.events.filter(e => e.sport === 'tennis')) console.log(' ', e.startUTC.slice(0, 10), e.status, e.comp, '|', e.home, 'v', e.away);
console.log('tennis rankings:', (f.rankings || []).filter(r => r.sport === 'tennis').map(r => r.title));
for (const page of ['ATP rankings', 'WTA rankings']) {
  const r = await (await fetch(`https://en.wikipedia.org/w/api.php?action=parse&format=json&formatversion=2&prop=text&redirects=1&page=${encodeURIComponent(page)}`, { headers: UA })).json();
  const h = r.parse.text;
  console.log(`\n${page}: captions/headers mentioning doubles:`);
  for (const m of h.matchAll(/<(caption|th)[^>]*>([\s\S]*?)<\/\1>/gi)) { const t = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); if (/as of|doubles/i.test(t)) console.log('   ', m[1], t.slice(0, 120)); }
  const i = h.search(/rankings \(doubles\) as of/i); if (i > 0) console.log(h.slice(i, i + 1500).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 700));
}
const titles = ['2027 United Cup', '2027 Brisbane International', '2027 ASB Classic', '2027 ASB Classic – Women\'s singles', '2027 Adelaide International', '2027 Hobart International', '2027 Australian Open', '2026 Billie Jean King Cup Finals', '2026 Davis Cup Finals', '2026 NSW Open', '2026 Playford International', '2026 Sydney Challenger', '2026 Brisbane International (ATP Challenger)', '2026 Canberra Tennis International', '2026 ATP Challenger Tour', '2026 ITF Women\'s World Tennis Tour'];
const q = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(titles.join('|')), { headers: UA })).json();
console.log('\nupcoming tennis pages:');
for (const pg of q.query.pages) {
  if (pg.missing) { console.log('  MISSING', pg.title); continue; }
  const t = pg.revisions[0].slots.main.content;
  const d = (t.match(/\|\s*(date|dates)\s*=\s*([^\n]*)/i) || [])[2] || '';
  console.log('  ', pg.title, '| date:', d.slice(0, 80), '| len', t.length);
  if (/Challenger Tour|World Tennis Tour/.test(pg.title)) {
    for (const m of t.matchAll(/\n\|[^\n]*(October|November|December)[^\n]*\n[\s\S]{0,400}?(Australia|New Zealand)[^\n]*/g)) console.log('      ', m[0].replace(/\s+/g, ' ').slice(0, 220));
  }
}
const K = process.env.YOUTUBE_API_KEY || '';
const yt = async (path, qq) => { const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${qq}&key=${K}`); const j = await r.json(); if (j.error) console.log('  api error:', j.error.code, j.error.message?.slice(0, 80)); return j; };
if (K) {
  console.log('\nchannel search:');
  for (const term of ['BLACKCAPS', 'White Ferns', 'New Zealand Cricket', 'Cricket Australia', 'Super Smash', 'Netball New Zealand', 'Basketball New Zealand', 'Hockey New Zealand', 'Tennis Australia', 'Football Ferns']) {
    const s = await yt('search', `part=snippet&type=channel&maxResults=3&q=${encodeURIComponent(term)}`);
    console.log(' ', term, '→', (s.items || []).map(x => `${x.snippet.channelId} "${x.snippet.title}"`).join(' ; '));
  }
  for (const id of ['UCkBY0aHJP9BwjZLDYxAQrKg']) {
    const s = await yt('search', `part=snippet&channelId=${id}&eventType=upcoming&type=video&maxResults=10`);
    console.log('\nupcoming on', id, (s.items || []).length); for (const x of s.items || []) console.log('   ', x.snippet.publishedAt, x.snippet.title.slice(0, 90));
  }
}
