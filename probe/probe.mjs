// probe 93: live feed TV guide, Supercars, squads
await new Promise(r => setTimeout(r, 200000));
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
console.log('generated', f.generatedAt);
for (const k of ['tvGuide', 'supercars', 'teamSquads', 'youtube']) console.log(`\n${k}:`, String(f.diag?.[k] || '').slice(0, 2500));
console.log('\ntables:', (f.tables || []).filter(t => t.team === 'supercars').map(t => `${t.title}: ${t.rows.slice(0, 3).map(r => r.name + ' ' + r.pts).join(', ')}`));
