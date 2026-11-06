import { writeFileSync } from 'fs';
const out = [];
const dims = b => { const u = new Uint8Array(b); return u[1] === 0x50 ? `${(u[16] << 24 | u[17] << 16 | u[18] << 8 | u[19])}x${(u[20] << 24 | u[21] << 16 | u[22] << 8 | u[23])}` : 'not png'; };
for (const u of ['https://flagcdn.com/h40/nz.png', 'https://flagcdn.com/h40/in.png', 'https://flagcdn.com/h40/gb-eng.png', 'https://flagcdn.com/h40/za.png', 'https://flagcdn.com/h240/nz.png',
  'https://r2.thesportsdb.com/images/media/league/badge/jifczi1773608397.png/small']) {
  try { const r = await fetch(u); const b = await r.arrayBuffer(); out.push(`${r.status} ${r.headers.get('content-type')} ${b.byteLength}B ${dims(b)} ${u}`); } catch (e) { out.push('err ' + e.message + ' ' + u); }
}
try { const h = await (await fetch('https://kickoff.kiwi/?x=' + Date.now())).text(); out.push(`site has nowChip: ${h.includes('const nowChip = (c, v, st)')}, tbrand: ${h.includes('nowchip.tbrand')}`); } catch (e) { out.push('site err ' + e.message); }
writeFileSync('probe/out.txt', 'flags300\n' + out.join('\n') + '\n');
