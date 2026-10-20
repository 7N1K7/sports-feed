// probe 92: save TheSportsDB's Supercars badge and logo to look at (small previews)
import { writeFile } from 'node:fs/promises';
for (const [n, u] of [['sc-badge', 'https://r2.thesportsdb.com/images/media/league/badge/64f67s1770108650.png/small'], ['sc-logo', 'https://r2.thesportsdb.com/images/media/league/logo/pk55ch1614547894.png/small']]) {
  const r = await fetch(u); const b = Buffer.from(await r.arrayBuffer()); console.log(n, r.status, b.length); if (r.ok) await writeFile(`probe/out-${n}.png`, b);
}
