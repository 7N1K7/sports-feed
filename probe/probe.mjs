// probe 110: which golf and sailing leaderboard pages exist (status and final URL), and the live feed's golf rounds
const urls = ['https://www.pgatour.com/leaderboard', 'https://www.lpga.com/leaderboard', 'https://www.lpga.com/tournaments',
  'https://pga.org.au/leaderboard/', 'https://www.pga.org.au/leaderboard', 'https://pga.org.au/tournaments/', 'https://pga.org.au/',
  'https://sailgp.com/races/', 'https://sailgp.com/', 'https://www.dpworldtour.com/leaderboard'];
for (const u of urls) {
  try {
    const r = await fetch(u, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36' } });
    const t = await r.text();
    console.log(r.status, u, '->', r.url, '|', (t.match(/<title[^>]*>([^<]*)/i) || [])[1]?.trim().slice(0, 90));
  } catch (e) { console.log('ERR', u, e.message); }
}
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
console.log('version', f.site?.version, 'golf now:', f.events.filter(e => e.sport === 'golf' && Math.abs(Date.parse(e.startUTC) - Date.now()) < 5 * 864e5).map(e => `${e.home} ${e.openUTC} -> ${e.startUTC} ${e.status}`));
