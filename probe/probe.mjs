import { writeFileSync } from 'fs';
const out = [];
for (const c of ['nz', 'in', 'au', 'za', 'pk', 'lk', 'bd']) { const r = await fetch(`https://flagcdn.com/w80/${c}.png`); out.push(`${c} ${r.status}`); if (r.ok) writeFileSync(`probe/out-flag-${c}.png`, Buffer.from(await r.arrayBuffer())); }
writeFileSync('probe/out.txt', 'flags ' + out.join(', ') + '\n');
