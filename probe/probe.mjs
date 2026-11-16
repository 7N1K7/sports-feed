const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
for (const e of f.events.filter(e => e.sport === 'golf' && Math.abs(Date.parse(e.startUTC) - Date.now()) < 9 * 864e5)) console.log(e.id, '|', e.startUTC, e.timeTBC ? 'TBC' : 'timed', '|', e.broadcast || '', '|', e.watchNote || '', '| tvAt', e.tvAt || e.tvStart || '');
for (const u of ['https://i.mjh.nz/SkySportNow/epg.xml', 'https://i.mjh.nz/SkyGo/epg.xml']) {
  const x = await (await fetch(u)).text();
  const ps = [...x.matchAll(/<programme start="(\d{14}) ([+-]\d{4})" stop="(\d{14}) [^"]*" channel="([^"]*)">([\s\S]*?)<\/programme>/g)]
    .filter(m => /golf|PGA|RSM|Austin|NSW Open|Queensland PGA|DP World|Masters/i.test(m[5]) && m[1] >= '20261116' && m[1] <= '20261124');
  for (const m of ps.slice(0, 40)) console.log(u.split('/')[3], m[4], m[1].slice(4, 12), m[2], '|', (m[5].match(/<title[^>]*>([^<]*)/) || [])[1], '|', ((m[5].match(/<desc[^>]*>([^<]*)/) || [])[1] || '').slice(0, 110));
}
