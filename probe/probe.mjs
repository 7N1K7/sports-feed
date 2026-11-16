for (const [t, re] of [['2026–27_Ford_Trophy', /(8|12) November/], ['2026–27_Dean_Jones_Trophy', /16 November/]]) {
  const r = await fetch('https://en.wikipedia.org/w/index.php?action=raw&title=' + encodeURIComponent(t), { headers: { 'user-agent': 'kickoff-kiwi-probe/1.0' } });
  const x = await r.text();
  const parts = x.split(/(?=\{\{\s*(?:Single-innings cricket match|Limited overs matches|Limited-overs matches))/i).slice(1);
  let n = 0;
  for (const p of parts) { const d = (p.match(/\|\s*date\s*=\s*([^\n|]*)/) || [])[1] || '?'; if (re.test(d) && n++ < 5) console.log('-----\n' + p.slice(0, 650)); }
  const h = await (await fetch('https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvlimit=6&rvprop=timestamp|comment&format=json&titles=' + encodeURIComponent(t), { headers: { 'user-agent': 'kickoff-kiwi-probe/1.0' } })).json();
  console.log('revisions', JSON.stringify(Object.values(h.query.pages)[0].revisions.map(v => v.timestamp + ' ' + (v.comment || '').slice(0, 60))));
}
