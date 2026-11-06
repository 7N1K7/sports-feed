import { writeFileSync } from 'fs';
const out = [];
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; kickoff-kiwi-probe)' };
const strip = h => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, ' ');
// Kayo Sports' terms: may its public schedule (what's on Kayo and when) be read automatically and reused?
for (const u of ['https://kayosports.com.au/robots.txt', 'https://kayosports.com.au/terms-of-use', 'https://kayosports.com.au/terms', 'https://help.kayosports.com.au/s/article/Kayo-Terms-of-Use', 'https://help.kayosports.com.au/s/terms-of-use', 'https://kayosports.com.au/legal', 'https://www.hubbl.com.au/legal/kayo-terms-of-use', 'https://kayosports.com.au/']) {
  try {
    const r = await fetch(u, { headers: UA, redirect: 'follow' }); const t = await r.text();
    out.push(`== ${u} -> ${r.status} ${r.url} len ${t.length}`);
    if (/robots\.txt$/.test(u)) { out.push(t.slice(0, 1500)); continue; }
    const s = strip(t);
    out.push('  title: ' + (t.match(/<title[^>]*>([^<]*)/i)?.[1] || '').slice(0, 120));
    const links = [...t.matchAll(/href="([^"]*(?:terms|legal|conditions)[^"]*)"/gi)].map(m => m[1]); out.push('  links: ' + [...new Set(links)].slice(0, 12).join(' '));
    for (const m of s.matchAll(/[^.]{0,220}(scrap|crawl|robot|spider|automat|data min|harvest|reproduc|framing|commercial purpose|personal use|non-commercial)[^.]{0,220}\./gi)) out.push('  > ' + m[0].trim().slice(0, 460));
  } catch (e) { out.push(`== ${u} error ${e.message}`); }
}
writeFileSync('probe/out.txt', 'kayo1\n' + out.join('\n') + '\n');
