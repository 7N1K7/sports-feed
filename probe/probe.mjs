// probe 127: the live feed after the golf additions: top 10s, golf rankings, golf headlines, squads, coverage file
let f = { events: [] };
try { f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json(); } catch (e) { console.log('feed error', e.message); }
console.log('site', JSON.stringify(f.site || {}), 'generated', f.generatedAt);
console.log('diag.golfTop10:', f.diag?.golfTop10);
console.log('diag.teamSquads:', String(f.diag?.teamSquads).slice(0, 300));
console.log('diag.rankings golf:', String(f.diag?.rankings || '').split('; ').filter(x => /golf|FedEx|Australasia/i.test(x)).join(' ;; '));
for (const l of (f.rankings || []).filter(r => r.sport === 'golf')) console.log(' ', l.title, l.asOf || '', l.comp || '', l.rows.length, l.rows.slice(0, 3).map(r => `${r.rank} ${r.name} ${r.val}`).join(' | '), '|', l.rows.filter(r => r.nz).map(r => `${r.rank} ${r.name}`).join(', '));
for (const e of f.events.filter(e => e.leaders)) console.log(' top10', e.id, e.leaders.length, e.leaders.slice(0, 2).map(r => `${r.p} ${r.n} ${r.par}`).join(' | '), e.leaders.filter(r => r.nz).map(r => r.n).join(','));
console.log('golf news', (f.news || []).filter(n => /^(pgatour|lpga|golfanz)$/.test(n.team)).length, (f.news || []).filter(n => /^(pgatour|lpga|golfanz)$/.test(n.team)).slice(0, 8).map(n => `${n.team}/${n.source}: ${n.title}`).join(' || '));
console.log('diag.bbc:', String(f.diag?.bbc || '').slice(0, 300));
try { const c = await (await fetch('https://kickoff.kiwi/data/coverage.json?x=' + Date.now())).text(); console.log('coverage.json', c.length, c.slice(0, 300)); } catch (e) { console.log('coverage.json error', e.message); }
console.log('baseball squads', (f.teamSquads || []).filter(s => s.sport === 'baseball').map(s => `${s.team} ${s.players.length}`).join(', '));
