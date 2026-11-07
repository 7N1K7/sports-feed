import { writeFileSync } from 'fs';
// the NZ flag (flagcdn, public domain) for the i button mock-ups
const out = [];
for (const u of ['https://flagcdn.com/h240/nz.png']) { const r = await fetch(u); const b = Buffer.from(await r.arrayBuffer()); writeFileSync('probe/out-flag-nz.png', b); out.push(`${u} ${r.status} ${b.length}`); }
writeFileSync('probe/out.txt', 'flagnz\n' + out.join('\n') + '\n');
