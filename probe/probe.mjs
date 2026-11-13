// 14 Nov daily check: did the filled games reach the live feed (nothing counted; no scores printed)
const f = await fetch(`https://kickoff.kiwi/data/feed.json?t=${Date.now()}`).then(r => r.json());
console.log('FILLED generatedAt', f.generatedAt, '|', f.diag?.domesticFromWiki);
for (const e of f.events || []) if (/Ford Trophy/.test(e.comp || '') && Date.parse(e.startUTC) < Date.now() || /Gallen|Buatsi/.test(e.home) || e.id === 'aw-ind-1-2026') console.log(e.startUTC.slice(0, 10), e.comp, '|', e.home, 'v', e.away, '| status', e.status, '| has score', !!e.score, '| source', (e.source || '').slice(0, 60));
console.log('noResult left:', (f.checks?.noResult || []).map(x => x.n).join('; '));
