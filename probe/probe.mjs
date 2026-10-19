// probe 21: kickoff.kiwi serving the site? http, https, www, the old github.io address, and the calendar files
for (const u of ['http://kickoff.kiwi/', 'https://kickoff.kiwi/', 'https://www.kickoff.kiwi/', 'https://7n1k7.github.io/sports-feed/', 'https://7n1k7.github.io/sports-feed/data/cal/nz.ics', 'https://kickoff.kiwi/data/cal/nz.ics', 'https://kickoff.kiwi/data/feed.json']) {
  try {
    const r = await fetch(u, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
    const t = r.status === 200 ? (await r.text()) : '';
    console.log(u, '->', r.status, r.headers.get('location') || '', '|', (t.match(/<title>([^<]*)/) || [])[1] || (t.startsWith('BEGIN:VCALENDAR') ? 'calendar ok' : t.startsWith('{') ? 'json ok' : t.slice(0, 60).replace(/\s+/g, ' ')));
  } catch (e) { console.log(u, '-> ERR', e.cause?.code || e.message); }
}
