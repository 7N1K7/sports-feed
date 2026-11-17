const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
const d = f.diag || {};
console.log('generated', f.generated || f.updated, '| nascar:', d.nascar, '| nascarTimes:', d.nascarTimes);
const n = (f.events || []).filter(e => e.team === 'nascar');
const by = {}; for (const e of n) { const y = e.id.split('-')[1]; by[y] = by[y] || { n: 0, fin: 0, tbc: 0, noVenue: 0 }; by[y].n++; if (e.status === 'final') by[y].fin++; if (e.timeTBC) by[y].tbc++; if (!e.venue || !e.city) by[y].noVenue++; }
console.log('events', n.length, JSON.stringify(by));
// no winners printed: names, dates and places only
for (const e of n.filter(e => e.status !== 'final').slice(0, 6)) console.log(e.id, '|', e.home, '|', e.venue, '|', e.city, '|', e.startUTC, e.tz, 'tbc', e.timeTBC, '|', e.broadcast, '|', e.watchAU);
const l = n.filter(e => e.status === 'final').pop(); if (l) console.log('last final:', l.id, '|', l.home, '|', l.venue, '|', l.startUTC, '| has score', !!l.score, '| link', l.link);
const names = n.map(e => e.home); console.log('odd names:', names.filter(x => /[\[\]{}|<>]/.test(x) || x.length > 60 || x.length < 4).join(' ; ') || 'none');
console.log('odd venues:', [...new Set(n.map(e => e.venue + ' / ' + e.city))].filter(x => /[\[\]{}|<>]/.test(x) || x.length > 80).join(' ; ') || 'none');
const ics = await (await fetch('https://kickoff.kiwi/data/cal/nascar.ics?' + Date.now())).text(); console.log('nascar.ics events', (ics.match(/BEGIN:VEVENT/g) || []).length);
const h = await (await fetch('https://kickoff.kiwi/?' + Date.now())).text(); console.log('site has switch', h.includes("['nascar','NASCAR']"), 'version', (h.match(/SITE_V\s*=\s*'?(\d+)/) || h.match(/>v(\d{3})</) || [])[1]);
