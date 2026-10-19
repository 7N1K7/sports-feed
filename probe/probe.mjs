// probe 9: what each candidate news feed's own terms say about showing its headlines on a website
const UA = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' };
const text = h => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;/g, "'").replace(/\s+/g, ' ');
const around = (t, re, n = 6, w = 420) => [...t.matchAll(re)].slice(0, n).map(m => '…' + t.slice(Math.max(0, m.index - w / 2), m.index + w) + '…');
const PAGES = [
  ['BBC RSS help', 'https://www.bbc.co.uk/news/10628494'],
  ['BBC RSS terms', 'https://www.bbc.co.uk/usingthebbc/terms/can-i-share-things-from-the-bbc/'],
  ['Guardian feeds help', 'https://www.theguardian.com/help/feeds'],
  ['Guardian terms', 'https://www.theguardian.com/help/terms-of-service'],
  ['Stuff terms', 'https://www.stuff.co.nz/about-stuff/terms-of-use'],
  ['Stuff terms 2', 'https://www.stuff.co.nz/terms-of-use'],
  ['Stuff rss page', 'https://www.stuff.co.nz/about-stuff/rss-feeds'],
  ['Newsroom terms', 'https://newsroom.co.nz/terms-and-conditions/'],
  ['Zero Tackle terms', 'https://www.zerotackle.com/terms-of-use/'],
  ['Sherdog terms', 'https://www.sherdog.com/terms'],
  ['Boxing News 24 terms', 'https://www.boxingnews24.com/terms-of-service/'],
  ['Bloody Elbow terms', 'https://bloodyelbow.com/terms-of-service/'],
  ['Motorsport.com terms', 'https://www.motorsport.com/info/terms/'],
];
for (const [name, url] of PAGES) {
  try {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000), redirect: 'follow' });
    const t = text(await r.text());
    const hits = around(t, /\bRSS\b|\bfeeds?\b|headline|automated|scrap|robot|spider|crawl/gi);
    console.log(`\n## ${name} ${r.status} ${r.url}\n${hits.join('\n') || t.slice(0, 300)}`);
  } catch (e) { console.log(`\n## ${name} ERR ${e.message}`); }
}
// the feeds' own channel notes (copyright / description / terms links)
for (const url of ['https://www.stuff.co.nz/rss/sport', 'https://feeds.bbci.co.uk/sport/cricket/rss.xml', 'https://www.theguardian.com/sport/cricket/rss', 'https://newsroom.co.nz/category/lockerroom/feed/', 'https://www.zerotackle.com/feed/', 'https://www.sherdog.com/rss/news.xml', 'https://bloodyelbow.com/feed/', 'https://www.boxingnews24.com/feed/', 'https://www.motorsport.com/rss/f1/news/']) {
  try {
    const x = await (await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) })).text();
    const ch = x.split(/<item[\s>]/)[0];
    console.log(`\nFEED ${url}\n   ${(ch.match(/<(copyright|dc:rights|description|managingEditor|generator)>[\s\S]*?<\/\1>/g) || []).join(' ').replace(/\s+/g, ' ').slice(0, 500)}`);
  } catch (e) { console.log('FEED ERR', url, e.message); }
}
