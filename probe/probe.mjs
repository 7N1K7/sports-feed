// probe 45: netball box layout (2026 ANZ Premiership, 2025 Constellation Cup), and rankings pages for basketball and netball
const UA = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi/; probe)' };
const raw = async t => { await new Promise(r => setTimeout(r, 1100)); const r = await fetch(`https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(t)}&action=raw`, { headers: UA }); return r.ok ? r.text() : ''; };
for (const t of ['2026 ANZ Premiership season', '2025 Constellation Cup']) {
  const s = await raw(t);
  const m = [...s.matchAll(/\{\{\s*netballbox/gi)];
  console.log(`\n##### ${t}: ${m.length} netballbox; template names:`, JSON.stringify([...new Set([...s.matchAll(/\{\{\s*([^|}\n]{3,40}?)\s*\|/g)].map(x => x[1].trim()).filter(n => /box|match|result|game/i.test(n)))]));
  if (m.length) console.log(s.slice(m[0].index, m[0].index + 900).replace(/\n{2,}/g, '\n'));
  const other = s.match(/\{\{\s*(?:Netball|Sports? ?results?|Match)[^|}\n]*\|[\s\S]{0,700}/i);
  if (!m.length && other) console.log(other[0]);
}
for (const t of ["FIBA Men's World Ranking", 'FIBA World Ranking', "FIBA Women's World Ranking", 'World Netball Rankings']) {
  await new Promise(r => setTimeout(r, 1100));
  const j = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=parse&prop=text&redirects=1&page=' + encodeURIComponent(t), { headers: UA })).json();
  if (j.error) { console.log(`\n##### ${t}: ${j.error.code}`); continue; }
  const html = j.parse.text, tables = [...html.matchAll(/<table[^>]*wikitable[^>]*>([\s\S]*?)<\/table>/gi)];
  console.log(`\n##### ${t} -> ${j.parse.title}: ${tables.length} tables`);
  for (const tb of tables.slice(0, 3)) { const rows = [...tb[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].slice(0, 4).map(r => r[1].replace(/<[^>]+>/g, ' ').replace(/&#160;|&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()); console.log('  ', rows.join(' || ').slice(0, 300)); }
  const asof = (html.replace(/<[^>]+>/g, ' ').match(/.{0,40}(as of|updated)[^.]{0,50}/i) || [])[0]; console.log('   as-of:', asof);
}
