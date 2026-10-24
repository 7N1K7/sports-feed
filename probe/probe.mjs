// probe 186: the live F1 session orders after the surname fix
import fs from 'fs';
const L = [], f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
L.push('diag.f1Sessions: ' + JSON.stringify(f.diag?.f1Sessions));
L.push('diag.f1SessionsSeen: ' + JSON.stringify(f.diag?.f1SessionsSeen));
for (const e of (f.events || []).filter(x => x.sess)) for (const s of e.sess) L.push(`  ${s.n} ${s.rows ? s.rows.map(r => `${r.p}.${r.d}/${r.tm}`).join(' ') : '-'}`);
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
