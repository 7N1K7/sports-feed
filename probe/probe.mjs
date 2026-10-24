import fs from 'fs';
const out = [];
for (const u of ['https://www.rugby-japan.jp/news/54073', 'https://www.rugby-japan.jp/en/news/54073']) {
  try {
    const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 KickoffKiwi' } }); const t = (await r.text()).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    out.push(`${u} ${r.status} len ${t.length}`);
    for (const m of t.matchAll(/.{0,120}(ウェールズ|Wales|10月24日|10\/24|Oct(ober)? 24|キックオフ|Kick ?-?off|KO).{0,160}/gi)) out.push('  ' + m[0]);
  } catch (e) { out.push(u + ' ERR ' + e.message); }
}
fs.writeFileSync(new URL('./out.txt', import.meta.url), out.slice(0, 40).join('\n'));
