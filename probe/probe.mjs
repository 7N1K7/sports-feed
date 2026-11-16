const f = await (await fetch('https://kickoff.kiwi/data/feed.json?y=' + Date.now())).json();
console.log('feed', f.generatedAt, 'version', f.site?.version ?? f.version ?? '?');
const t = f.events.filter(e => e.sport === 'tennis');
console.log('tennis events', t.length);
for (const e of t) console.log(e.id, '|', e.team, '|', (e.tags || []).join(','), '|', e.comp, '|', e.startUTC.slice(0, 10));
for (const k of ['tslams', 'tfinals', 'asbclassic', 'tausummer', 'tennis']) {
  const r = await fetch(`https://kickoff.kiwi/data/cal/${k}.ics?y=` + Date.now());
  const x = r.ok ? await r.text() : '';
  console.log('cal', k, r.status, 'events', (x.match(/BEGIN:VEVENT/g) || []).length, (x.match(/X-WR-CALNAME:(.*)/) || [])[1] || '');
}
const p = await (await fetch('https://kickoff.kiwi/?y=' + Date.now())).text();
console.log('page has split', /TENNIS_KEYS/.test(p));
