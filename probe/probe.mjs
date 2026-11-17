// TV guide listings for netball this week: channel, start (UTC), title, first words of the description (no scores)
const seen = new Set();
for (const url of ['https://i.mjh.nz/SkySportNow/epg.xml', 'https://i.mjh.nz/SkyGo/epg.xml', 'https://i.mjh.nz/nz/epg.xml']) {
  try {
    const x = await (await fetch(url)).text();
    const ch = Object.fromEntries([...x.matchAll(/<channel id="([^"]+)">\s*<display-name[^>]*>([^<]*)/g)].map(m => [m[1], m[2]]));
    for (const m of x.matchAll(/<programme start="(\d{14}) ([+-]\d{4})" stop="(\d{14})[^"]*" channel="([^"]+)">([\s\S]*?)<\/programme>/g)) {
      const body = m[5], title = (body.match(/<title[^>]*>([^<]*)/) || [])[1] || '', desc = (body.match(/<desc[^>]*>([^<]*)/) || [])[1] || '';
      if (!/netball|silver ferns|net blacks/i.test(title + ' ' + desc)) continue;
      const k = `${ch[m[4]]}|${m[1]}|${title}`; if (seen.has(k)) continue; seen.add(k);
      console.log(url.split('/')[3], '|', ch[m[4]], '|', m[1], m[2], '-', m[3].slice(8, 12), '|', title, '|', desc.replace(/\d+\s*[-–]\s*\d+/g, '#').slice(0, 150));
    }
  } catch (e) { console.log(url, 'error', e.message); }
}
