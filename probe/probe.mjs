const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
console.log('now', new Date().toISOString());
// no scores printed
for (const e of (f.events || []).filter(e => /^(wmseries|pak-sl-t2)/.test(e.id))) console.log(e.id, e.startUTC, '|', e.home, 'v', e.away, '|', e.venue, '|', e.status, '|', e.broadcast, '|', e.watchAlt || '', '| tv', JSON.stringify(e.tv || e.channel || e.guide || '').slice(0, 120));
const h = await (await fetch('https://kickoff.kiwi/stats.html?' + Date.now())).text(); console.log('stats page has graph range buttons:', h.includes('seg mini'), '| netball miss logged:', h.includes('WM New Zealand Netball Series'));
const v = await (await fetch('https://kickoff.kiwi/data/version.json?' + Date.now())).json().catch(() => ({})); console.log('version', v.version);
