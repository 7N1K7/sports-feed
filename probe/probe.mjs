// probe 9c: the text of BBC terms section 15 (metadata and RSS feeds), and Sherdog's aggregation line in full
const UA = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' };
const text = h => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&#039;|&rsquo;|&#8217;/g, "'").replace(/&ldquo;|&rdquo;/g, '"').replace(/\s+/g, ' ');
const t = text(await (await fetch('https://www.bbc.co.uk/usingthebbc/terms-of-use/', { headers: UA })).text());
const i = t.lastIndexOf('15. Metadata and RSS feeds');
console.log('## BBC section 15\n', t.slice(i, i + 2200));
const s = text(await (await fetch('https://www.sherdog.com/terms-of-use', { headers: UA })).text());
const j = s.search(/aggregate or collate/i);
console.log('\n## Sherdog\n', s.slice(j - 100, j + 500));
