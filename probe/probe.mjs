// 13 Nov: after the review fixes went live, is the feed sound? Counts only, no scores or headlines
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?probe=' + Date.now())).json();
const ev = f.events || [], ids = {};
for (const e of ev) ids[e.id] = (ids[e.id] || 0) + 1;
console.log('built', f.generated || f.built || f.updated || Object.keys(f).join(','));
console.log('events', ev.length, 'news', (f.news || []).length, 'tables', (f.tables || []).length, 'rankings', (f.rankings || []).length);
console.log('duplicate ids', Object.entries(ids).filter(([, n]) => n > 1).map(([k, n]) => k + ' x' + n).join(', ') || 'none');
console.log('supercars 2027', ev.filter(e => /^supercars-2027-/.test(e.id)).map(e => `${e.id} ${e.stage || ''} ${e.city || e.venue || ''}`).join(' | '));
const kinds = {}; for (const n of f.news || []) kinds[n.kind] = (kinds[n.kind] || 0) + 1; console.log('news kinds', JSON.stringify(kinds));
console.log('golf TBA rows', ev.filter(e => e.sport === 'golf' && /^(TBA|TBD|TBC)$/i.test(e.home || e.title || '')).length);
console.log('names with footnote braces', ev.filter(e => /\{\{|<!--/.test([e.home, e.away, e.venue, e.stage].join(' '))).length);
const live = ev.filter(e => e.liveScore || e.progress); console.log('live now', live.length, 'with liveScore', live.filter(e => e.liveScore).length);
console.log('rain notes', ev.filter(e => e.weather || e.rain).length, '| diag rainHeadlines:', String(f.diag?.rainHeadlines || '').replace(/:.*/s, ''));
console.log('ranking lists with a tied rank', (f.rankings || []).filter(r => JSON.stringify(r).match(/"rank":"?(T|=)|\(T\)/)).length);
console.log('diag wikipedia', String(f.diag?.wikipedia || '').slice(0, 160));
