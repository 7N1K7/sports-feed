// probe 18: .kiwi first-year vs renewal prices on the registrars' own pages
const UA = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', 'accept-language': 'en-NZ,en;q=0.9' };
const text = h => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const PAGES = [
  ['Crazy Domains .kiwi', 'https://www.crazydomains.co.nz/domain-names/kiwi/'],
  ['Crazy Domains .kiwi (alt)', 'https://www.crazydomains.co.nz/domains/kiwi-domain-names/'],
  ['Crazy Domains pricing', 'https://www.crazydomains.co.nz/domain-names/pricing/'],
  ['Namecheap .kiwi', 'https://www.namecheap.com/domains/registration/gtld/kiwi/'],
  ['Metaname pricing', 'https://metaname.net/pricing'],
  ['Metaname domains', 'https://metaname.net/domains'],
];
for (const [name, url] of PAGES) {
  try {
    const r = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(20000) });
    const h = await r.text(), t = text(h);
    const hits = [...t.matchAll(/\.?kiwi[^.]{0,160}?(\$\s?\d+[\d.,]*)[^$]{0,160}/gi)].slice(0, 5).map(m => m[0].trim());
    const renew = [...t.matchAll(/renew\w*[^$]{0,80}\$\s?\d+[\d.,]*|\$\s?\d+[\d.,]*[^$]{0,40}renew\w*/gi)].slice(0, 4).map(m => m[0].trim());
    const json = [...h.matchAll(/"(?:price|renewPrice|renewalPrice|registerPrice|regular_price|renewal_price)"\s*:\s*"?([\d.]+)/gi)].slice(0, 8).map(m => m[0]);
    console.log(`\n## ${name} ${r.status} ${r.url}\n  kiwi: ${hits.join(' || ').slice(0, 900) || '-'}\n  renew: ${renew.join(' || ').slice(0, 500) || '-'}\n  json: ${json.join(' ')}`);
  } catch (e) { console.log(`\n## ${name} ERR ${e.message}`); }
}
