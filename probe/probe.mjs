const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
console.log('built', f.generated || f.updatedAt || f.updated);
for (const e of f.events.filter(e => e.team === 'audomestic' && Math.abs(Date.parse(e.startUTC) - Date.now()) < 20 * 36e5))
  console.log(e.id, '|', e.comp, '|', e.startUTC, e.status, '| progress:', e.progress || '-', '| weather:', e.weather ? 'yes' : '-', '| wx:', JSON.stringify(e.wxNews ? e.wxNews.title : ''), '| tv:', e.broadcast, '| live:', !!e.liveScore);
console.log('diag', JSON.stringify(f.diag ? Object.fromEntries(Object.entries(f.diag).filter(([k]) => /sportmonks|rain|wx|bbc|herald|epg|guide|sky/i.test(k)).map(([k, v]) => [k, String(v).slice(0, 300)])) : {}));
for (const u of ['https://i.mjh.nz/SkySportNow/epg.xml', 'https://i.mjh.nz/SkyGo/epg.xml']) {
  const x = await (await fetch(u)).text();
  const now = new Date(), stamp = d => d.toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const progs = [...x.matchAll(/<programme start="(\d{12})\d* [^"]*" stop="(\d{12})\d* [^"]*" channel="([^"]*)">([\s\S]*?)<\/programme>/g)]
    .filter(m => m[1] <= stamp(new Date(now - 0)) && m[2] >= stamp(now) && /cricket|dean jones|rain/i.test(m[4]));
  for (const m of progs) console.log(u.split('/')[3], m[3], m[1], m[2], (m[4].match(/<title[^>]*>([^<]*)/) || [])[1], '|', ((m[4].match(/<desc[^>]*>([^<]*)/) || [])[1] || '').slice(0, 160));
}
