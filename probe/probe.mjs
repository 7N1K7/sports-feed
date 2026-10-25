// probe 198: flagcdn's PNG flags by height (h120, h240): there for every code the site uses, their sizes and weights
import fs from 'fs';
const L = [];
const codes = ['nz', 'au', 'gb-eng', 'gb-sct', 'gb-wls', 'ie', 'fr', 'in', 'np', 'ck', 'qa', 'ws', 'to', 'fj', 'pg', 'lk', 'za', 'us', 'jp', 'ae', 'bm', 'je', 'ch'];
for (const h of ['h120', 'h240']) for (const c of codes) {
  try { const r = await fetch(`https://flagcdn.com/${h}/${c}.png`); const b = Buffer.from(await r.arrayBuffer());
    const w = b.length > 24 ? b.readUInt32BE(16) : 0, hh = b.length > 24 ? b.readUInt32BE(20) : 0;
    L.push(`${h}/${c}: ${r.status} ${r.headers.get('content-type')} ${w}x${hh} ${b.length}B cors=${r.headers.get('access-control-allow-origin')} cache=${r.headers.get('cache-control')}`); }
  catch (e) { L.push(`${h}/${c} ERR ${e.message}`); }
}
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
