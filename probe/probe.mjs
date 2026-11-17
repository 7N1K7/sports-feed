const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
console.log('now', new Date().toISOString());
// no scores printed: ids, times, places and status only
for (const e of (f.events || []).filter(e => /^pak-sl-t/.test(e.id))) console.log(e.id, e.startUTC, '|', e.venue, '|', e.city, '|', e.status, '| days', e.days || '', '| broadcast', e.broadcast || '');
