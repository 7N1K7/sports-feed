// probe 54: licences of the Commons files for Queensland and WA, and a search for South Australia's
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const api = async q => { await new Promise(r => setTimeout(r, 900)); return (await fetch('https://commons.wikimedia.org/w/api.php?format=json&formatversion=2&' + q, { headers: UA })).json(); };
const info = async titles => {
  const ii = await api('action=query&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=120&titles=' + encodeURIComponent(titles.join('|')));
  for (const pg of ii.query.pages) { const i = pg.imageinfo?.[0] || {}, m = i.extmetadata || {};
    console.log(pg.title, '|', i.mime, i.width + 'x' + i.height, '| licence:', m.LicenseShortName?.value, '|', (m.UsageTerms?.value || '').slice(0, 80), '| attribution needed:', m.AttributionRequired?.value, '| artist:', (m.Artist?.value || '').replace(/<[^>]+>/g, '').slice(0, 60), '| desc:', (m.ImageDescription?.value || '').replace(/<[^>]+>/g, '').slice(0, 120), '| thumb:', i.thumburl); }
};
await info(['File:Queensland Cricket logo.png', 'File:Cricket WA colour.svg']);
for (const q of ['South Australian Cricket Association', 'SACA logo', 'South Australia cricket logo', 'Redbacks logo', 'Cricket Tasmania logo', 'Cricket NSW logo', 'Cricket Victoria logo']) {
  const s = await api('action=query&list=search&srnamespace=6&srlimit=8&srsearch=' + encodeURIComponent(q));
  console.log(`search "${q}":`, (s.query?.search || []).map(x => x.title).filter(t => !/\.pdf$/i.test(t)).join(' | ') || 'none');
}
const cats = await api('action=query&list=categorymembers&cmtype=file&cmlimit=50&cmtitle=' + encodeURIComponent('Category:Cricket logos'));
console.log('Category:Cricket logos:', (cats.query?.categorymembers || []).map(x => x.title).filter(t => /austral|queens|wales|victoria|tasman|redback|warrior|bulls|WA\b|SACA/i.test(t)).join(' | ') || 'nothing Australian');
