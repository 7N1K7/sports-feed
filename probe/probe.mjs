// probe 121: does the balldontlie key work (never print it): NBA and MLB games, free-tier limits
const KEY = process.env.BALLDONTLIE_KEY || '';
const red = s => KEY ? String(s).split(KEY).join('***') : String(s);
console.log('key present:', !!KEY, 'length:', KEY.length);
const get = async path => {
  const r = await fetch('https://api.balldontlie.io' + path, { headers: { Authorization: KEY } });
  const lim = ['x-ratelimit-limit', 'x-ratelimit-remaining', 'retry-after'].map(h => `${h}=${r.headers.get(h)}`).join(' ');
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return { status: r.status, lim, j, t };
};
for (const [label, path] of [
  ['NBA games 23-24 Oct', '/v1/games?dates[]=2026-10-22&dates[]=2026-10-23&per_page=100'],
  ['NBA season 2026 page 1', '/v1/games?seasons[]=2026&per_page=100'],
  ['NBA teams', '/v1/teams'],
  ['MLB games World Series dates', '/mlb/v1/games?dates[]=2026-10-23&dates[]=2026-10-24&per_page=100'],
  ['MLB teams', '/mlb/v1/teams'],
]) {
  try {
    const { status, lim, j, t } = await get(path);
    console.log(`== ${label}: ${status} ${lim}`);
    if (!j) { console.log(red(t.slice(0, 200))); continue; }
    const d = j.data || [];
    console.log('rows', d.length, 'meta', JSON.stringify(j.meta || {}));
    for (const g of d.slice(0, 4)) console.log(red(JSON.stringify(g).slice(0, 500)));
    if (!d.length) console.log(red(t.slice(0, 300)));
  } catch (e) { console.log(`== ${label}: error ${red(e.message)}`); }
  await new Promise(r => setTimeout(r, 13000));
}
