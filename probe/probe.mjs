// probe 14: the BBC and Herald cricket headlines right now that mention rain or delays, with their times
const now = Date.now();
for (const url of ['https://feeds.bbci.co.uk/sport/cricket/rss.xml', 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/sport/cricket/?outputType=xml&_website=nzh']) {
  const x = await (await fetch(url, { headers: { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' } })).text();
  for (const m of x.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const t = (m[1].match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1], d = (m[1].match(/<pubDate>([^<]*)/) || [])[1];
    const age = ((now - Date.parse(d)) / 36e5).toFixed(1);
    if (/rain|delay|wet|washed|abandon|light|south africa|australia/i.test(t)) console.log(url.includes('bbc') ? 'BBC' : 'NZH', age + 'h ago', '|', t);
  }
}
