// 13 Nov: TheSportsDB's own rules for uploading images (public pages only)
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; kickoff-probe)' };
const text = h => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<br\s*\/?>|<\/p>|<\/li>|<\/h\d>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#039;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n');
const get = async u => { try { const r = await fetch(u, { headers: UA, redirect: 'follow' }); return { s: r.status, h: await r.text() }; } catch (e) { return { s: 'ERR ' + e.message, h: '' }; } };
const home = await get('https://www.thesportsdb.com/');
console.log('home', home.s, home.h.length);
const links = new Set([...home.h.matchAll(/href="([^"#]+)"/g)].map(m => new URL(m[1], 'https://www.thesportsdb.com/').href).filter(u => /thesportsdb\.com/.test(u) && /faq|doc|term|legal|artwork|upload|guide|rule|help|api|about|licen|copyright|contribut|edit/i.test(u)));
for (const u of ['https://www.thesportsdb.com/docs_faq', 'https://www.thesportsdb.com/docs_artwork_guide', 'https://www.thesportsdb.com/terms', 'https://www.thesportsdb.com/docs_api_examples', 'https://www.thesportsdb.com/free_sports_api', 'https://www.thesportsdb.com/docs_upload_rules', 'https://www.thesportsdb.com/docs_rules']) links.add(u);
console.log('links', [...links].join(' '));
const KEY = /upload|artwork|copyright|licen[cs]e|moderat|approv|png|jpe?g|transparen|pixel|\bpx\b|resolution|watermark|attribut|credit|hotlink|cdn|patreon|premium|member|lock|fanart|badge|logo|cutout|banner|own(ed|er)? |permission|creative commons|free to use|commercial|cache/i;
for (const u of [...links].slice(0, 25)) {
  const r = await get(u); const t = text(r.h);
  const lines = t.split('\n').map(x => x.trim()).filter(x => x.length > 20 && x.length < 700 && KEY.test(x));
  console.log(`\n==== ${u} | ${r.s} | ${t.length} chars | ${lines.length} matching lines`);
  for (const l of [...new Set(lines)].slice(0, 45)) console.log(' - ' + l);
}
