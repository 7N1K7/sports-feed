// probe 190: the USA XV v Wallabies game: the live feed's entry, and anything rugby in the NZ TV guides around it
import fs from 'fs';
const L = [];
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
for (const e of (f.events || []).filter(x => /wallabies/.test(x.id))) L.push(JSON.stringify({ id: e.id, start: e.startUTC, b: e.broadcast, alt: e.watchAlt, note: e.watchNote, tv: e.tv, au: e.watchAU, yt: e.yt }));
for (const url of ['https://i.mjh.nz/SkyGo/epg.xml', 'https://i.mjh.nz/nz/epg.xml']) {
  const x = await (await fetch(url)).text();
  const ch = Object.fromEntries([...x.matchAll(/<channel id="([^"]+)">\s*<display-name>([^<]+)/g)].map(m => [m[1], m[2]]));
  const progs = [...x.matchAll(/<programme start="(\d{12})[^"]*"[^>]*channel="([^"]+)"[^>]*>([\s\S]*?)<\/programme>/g)];
  L.push(`\n${url}: ${progs.length} programmes`);
  for (const m of progs) {
    const title = (m[3].match(/<title[^>]*>([^<]*)/) || [])[1] || '', desc = (m[3].match(/<desc[^>]*>([^<]*)/) || [])[1] || '';
    if (/wallab|united states|usa\b|usa v|eagles/i.test(title + ' ' + desc) && /rugby|wallab|test/i.test(title + ' ' + desc) && m[1] >= '202610241800' && m[1] <= '202611010600')
      L.push(`${m[1]} ${ch[m[2]] || m[2]} | ${title} | ${desc.slice(0, 140)}`);
  }
  // what the Sky Sport channels show around kick-off (23:00Z = 12pm NZ)
  for (const m of progs) if (m[1] >= '202610242200' && m[1] <= '202610250030' && /sport|espn|three|tvnz|open|duke/i.test(ch[m[2]] || m[2])) {
    const title = (m[3].match(/<title[^>]*>([^<]*)/) || [])[1] || ''; L.push(`  ${m[1]} ${ch[m[2]] || m[2]}: ${title}`); }
}
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
