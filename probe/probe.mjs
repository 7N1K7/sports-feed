// 15 Nov: the All Whites v India game today in the NZ TV guides (i.mjh.nz), and its kick-off on Wikipedia
const UA = { 'user-agent': 'sports-fixture-check/1.0 (fixture times; contact via site)' };
console.log('AWIND');
const nz = s => new Date(s.replace(/^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d) ([+-]\d\d)(\d\d)$/, '$1-$2-$3T$4:$5:$6$7:$8')).toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland', weekday: 'short', hour: 'numeric', minute: '2-digit' });
for (const url of ['https://i.mjh.nz/nz/epg.xml', 'https://i.mjh.nz/SkyGo/epg.xml', 'https://i.mjh.nz/SkySportNow/epg.xml']) {
  const x = await (await fetch(url, { headers: UA })).text();
  const names = Object.fromEntries([...x.matchAll(/<channel id="([^"]+)"[^>]*>\s*<display-name[^>]*>([^<]+)</g)].map(m => [m[1], m[2]]));
  console.log('==', url, x.length);
  for (const m of x.matchAll(/<programme([^>]*)>([\s\S]*?)<\/programme>/g)) {
    const a = m[1], body = m[2], title = (body.match(/<title[^>]*>([^<]*)/) || [, ''])[1], desc = (body.match(/<desc[^>]*>([^<]*)/) || [, ''])[1];
    const st = (a.match(/start="([^"]+)"/) || [])[1], ch = (a.match(/channel="([^"]+)"/) || [])[1];
    if (!st || !/^2026111(4|5)/.test(st)) continue;
    if (/All Whites|India|Football|Soccer/i.test(title + ' ' + desc) && !/Cricket|Big Bash/i.test(title)) console.log(nz(st), '|', names[ch] || ch, '|', title.slice(0, 80), '|', desc.slice(0, 140));
  }
}
const w = await (await fetch('https://en.wikipedia.org/w/index.php?action=raw&title=' + encodeURIComponent('New Zealand men\'s national football team results (2020–present)'), { headers: UA })).text();
const i = w.search(/15 November 2026/); console.log('== wiki', w.length, i >= 0 ? JSON.stringify(w.slice(i - 50, i + 500).replace(/\|\s*score\s*=[^\n|]*/g, '|score=(hidden)')) : 'not found');
