for (const t of ['2026–27_Dean_Jones_Trophy', '2026–27_Ford_Trophy']) {
  const r = await fetch('https://en.wikipedia.org/w/index.php?action=raw&title=' + encodeURIComponent(t), { headers: { 'user-agent': 'kickoff-kiwi-probe/1.0' } });
  const x = await r.text();
  console.log(t, r.status, x.length);
  // each match template: its date and whether a result line is filled (no scores printed)
  const parts = x.split(/\{\{\s*(?:Single-innings cricket match|Limited overs matches|Limited-overs matches)/i).slice(1);
  console.log('matches', parts.length);
  for (const p of parts) { const d = (p.match(/\|\s*date\s*=\s*([^\n|]*)/) || [])[1] || '?', t1 = (p.match(/\|\s*team1\s*=\s*([^\n]*)/) || [])[1] || '', t2 = (p.match(/\|\s*team2\s*=\s*([^\n]*)/) || [])[1] || '', res = (p.match(/\|\s*result\s*=\s*([^\n]*)/) || [])[1] || '';
    if (/1[0-9] November|[89] November/.test(d)) console.log(' ', d.trim().slice(0, 40), '|', t1.replace(/[{}]/g, '').slice(0, 30), 'v', t2.replace(/[{}]/g, '').slice(0, 30), '| result filled:', res.trim().length > 3); }
}
