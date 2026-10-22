// probe 109: the live feed after v385: NBL ladder, doubles ranks, golf and sailing
import { writeFileSync } from 'node:fs';
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
writeFileSync('probe/out-feed.json', JSON.stringify(f));
console.log('generated', f.generatedAt, 'version', f.site?.version, 'events', f.events?.length);
console.log('NBL tables:', JSON.stringify(f.tables.filter(t => t.comp === 'NBL').map(t => `${t.style} ${t.rows.length}: ${t.rows.slice(0, 4).map(r => `${r.name} ${r.w}-${r.l} ${r.pct}`).join(', ')}`)));
console.log('tables diag NBL:', (Array.isArray(f.diag.tables) ? f.diag.tables : [String(f.diag.tables)]).filter(x => /NBL/.test(x)));
const d = f.rankings.find(r => r.title === "Men's doubles"); console.log("Men's doubles:", d?.rows.slice(0, 4).map(r => `${r.rank} ${r.name}`).join('; '));
console.log('motor:', f.diag.motorRankings);
console.log('wikiRetries:', f.diag.wikiRetries, '| golf:', JSON.stringify(f.diag.golf), '| sailgp:', f.diag.sailgp);
