// probe 120: MLB standings templates, a played series page's summary and linescore, NPB standings section
const UA = { 'user-agent': 'sports-feed probe (personal site)' };
const raw = async t => { const r = await fetch(`https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(t)}&action=raw`, { headers: UA }); return [r.status, await r.text()]; };
{ const [st, x] = await raw('Template:2026 AL East standings'); console.log('===== AL East', st, x.length); console.log(x.slice(0, 3500)); }
for (const t of ['2026 American League Championship Series', '2026 American League Wild Card Series', '2026 National League Division Series']) {
  const [st, x] = await raw(t);
  console.log('=====', t, st, x.length);
  const i = x.search(/\{\{\s*MLB Playoff Summary/i); if (i >= 0) console.log(x.slice(i, i + 900));
  const j = x.search(/\{\{\s*linescore/i); if (j >= 0) console.log('--- linescore\n' + x.slice(j, j + 900));
  console.log('summaries:', (x.match(/\{\{\s*MLB Playoff Summary/gi) || []).length, 'linescores:', (x.match(/\{\{\s*linescore/gi) || []).length);
}
{ const [st, x] = await raw('2026 Nippon Professional Baseball season'); const i = x.search(/==\s*Regular season standings/); console.log('===== NPB standings', st); console.log(x.slice(i, i + 3500)); }
