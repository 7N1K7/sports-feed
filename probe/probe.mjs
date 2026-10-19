// probe 9b: BBC's RSS reuse clause, and Stuff's terms found from its own footer links
const UA = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' };
const text = h => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;|&#039;|&#x27;/g, "'").replace(/\s+/g, ' ');
const get = async url => { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000), redirect: 'follow' }); return { s: r.status, u: r.url, h: await r.text() }; };
{
  const r = await get('https://www.bbc.co.uk/usingthebbc/terms-of-use/');
  const t = text(r.h);
  const i = t.search(/Metadata and RSS feeds|RSS feeds/i);
  console.log('## BBC terms', r.s, r.u, '\n', i >= 0 ? t.slice(Math.max(0, i - 200), i + 2600) : t.slice(0, 500));
}
for (const home of ['https://www.stuff.co.nz/', 'https://newsroom.co.nz/', 'https://www.zerotackle.com/', 'https://www.sherdog.com/', 'https://www.boxingnews24.com/', 'https://www.motorsport.com/']) {
  try {
    const r = await get(home);
    const links = [...new Set([...r.h.matchAll(/href="([^"]*(?:terms|conditions|legal|copyright|rss|syndicat)[^"]*)"/gi)].map(m => new URL(m[1], r.u).href))].slice(0, 6);
    console.log(`\n## ${home} ${r.s} links: ${links.join(' ')}`);
    for (const l of links.filter(l => /terms|conditions|legal|copyright/i.test(l)).slice(0, 2)) {
      try {
        const p = await get(l);
        const t = text(p.h);
        const hits = [...t.matchAll(/\bRSS\b|\bfeeds?\b|headlines?|automated|scrap|robot|crawl|reproduc|non-commercial|personal use/gi)].slice(0, 6).map(m => '…' + t.slice(Math.max(0, m.index - 220), m.index + 320) + '…');
        console.log(`   -> ${l} ${p.s}\n${hits.join('\n') || '   ' + t.slice(0, 300)}`);
      } catch (e) { console.log('   ERR', l, e.message); }
    }
  } catch (e) { console.log('ERR', home, e.message); }
}
